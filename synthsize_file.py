import os
import re
import sys
import time
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Set, Union

import requests

REPLICATE_SPEECH_URL = "https://api.replicate.com/v1/audio/speech"
REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions"
MAX_CHARS_PER_CHUNK = 280
POLL_INTERVAL_SECONDS = 2.0
MAX_POLL_ATTEMPTS = 60
ENV_LOCAL_FILENAME = ".env.local"
MARKDOWN_RELATIVE_PATH = Path("public") / "private" / "for_synthesis.md"
PROJECT_ROOT = Path(__file__).resolve().parent


def load_env_local(filename: str = ENV_LOCAL_FILENAME) -> Dict[str, str]:
    env_path = PROJECT_ROOT / filename
    env_vars: Dict[str, str] = {}
    if not env_path.exists():
        print(f"[config] No .env.local file found at {env_path}.")
        return env_vars

    print(f"[config] Parsed .env.local from {env_path}")
    with env_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]
            env_vars[key] = value

    return env_vars


def load_markdown_text(path: Union[str, Path, None] = None) -> str:
    if path is None:
        prompt_path = PROJECT_ROOT / MARKDOWN_RELATIVE_PATH
    else:
        prompt_path = Path(path)
        if not prompt_path.is_absolute():
            prompt_path = PROJECT_ROOT / prompt_path

    print(f"[config] Using synthesis prompt at {prompt_path}")
    try:
        with prompt_path.open("r", encoding="utf-8") as handle:
            return handle.read()
    except FileNotFoundError as exc:
        raise SystemExit(f"Markdown source file not found: {prompt_path}") from exc


def clean_markdown(text: str) -> str:
    no_backticks = re.sub(r"`+", "", text)
    no_headings = re.sub(r"^[#]+\s*", "", no_backticks, flags=re.MULTILINE)
    no_bullets = re.sub(r"^[\-\*]\s+", "", no_headings, flags=re.MULTILINE)
    no_list_numbers = re.sub(r"^\d+\)\s*", "", no_bullets, flags=re.MULTILINE)
    collapsed = re.sub(r"\s+", " ", no_list_numbers)
    return collapsed.strip()


def chunk_text(text: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> List[str]:
    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", text) if sentence.strip()]
    chunks: List[str] = []
    current: List[str] = []

    for sentence in sentences:
        if len(sentence) > max_chars:
            if current:
                chunks.append(" ".join(current))
                current = []
            chunks.extend(_split_long_sentence(sentence, max_chars))
            continue

        candidate_length = len(" ".join(current + [sentence]).strip())
        if current and candidate_length > max_chars:
            chunks.append(" ".join(current))
            current = [sentence]
        else:
            current.append(sentence)

    if current:
        chunks.append(" ".join(current))

    return [chunk for chunk in chunks if chunk.strip()]


def _split_long_sentence(sentence: str, max_chars: int) -> List[str]:
    wrapped = textwrap.wrap(sentence, max_chars, break_long_words=False, break_on_hyphens=False)
    if wrapped:
        return wrapped
    return [sentence[:max_chars]]


def create_prediction(text_chunk: str, token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "meta/voice-se",
        "input": {
            "text": text_chunk,
            "voice": "trustworthy_man",
            "format": "wav",
            "sample_rate": 44100,
        },
    }
    response = requests.post(REPLICATE_SPEECH_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()

    status = data.get("status")
    if status is None:
        raise RuntimeError("Unexpected response payload missing 'status'.")
    if status == "succeeded" and data.get("output"):
        return data

    prediction_id = data.get("id")
    if not prediction_id:
        raise RuntimeError(f"Prediction did not succeed immediately and no id was returned. Response: {data}")

    print(f"[prediction] Submitted chunk. Prediction id={prediction_id}. Polling for completion...")
    return poll_prediction(prediction_id, token)


def poll_prediction(prediction_id: str, token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    for attempt in range(1, MAX_POLL_ATTEMPTS + 1):
        response = requests.get(f"{REPLICATE_PREDICTIONS_URL}/{prediction_id}", headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

        status = data.get("status")
        print(f"[poll] Attempt {attempt}: prediction {prediction_id} status={status}")
        if status == "succeeded":
            if data.get("output"):
                return data
            raise RuntimeError(f"Prediction {prediction_id} succeeded but no output was returned.")
        if status in {"failed", "canceled"}:
            error_message = data.get("error") or f"Prediction {prediction_id} ended with status '{status}'."
            raise RuntimeError(error_message)

        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(f"Prediction {prediction_id} did not complete within the allotted polling attempts.")


def collect_audio_urls(output: Any) -> List[str]:
    urls: List[str] = []
    seen: Set[str] = set()

    def _collect(item: Any) -> None:
        if item is None:
            return
        if isinstance(item, str):
            stripped = item.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                urls.append(stripped)
            return
        if isinstance(item, dict):
            for key in ("audio", "url"):
                value = item.get(key)
                if isinstance(value, str):
                    _collect(value)
            for value in item.values():
                if isinstance(value, (list, tuple)):
                    for child in value:
                        _collect(child)
            return
        if isinstance(item, (list, tuple)):
            for child in item:
                _collect(child)

    _collect(output)

    if not urls:
        raise RuntimeError("No downloadable audio URLs were found in the prediction output.")
    return urls


def download_audio(url: str, filename: str) -> None:
    with requests.get(url, stream=True, timeout=120) as response:
        response.raise_for_status()
        with open(filename, "wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)


def main() -> None:
    env_vars = load_env_local()
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        token_from_file = env_vars.get("REPLICATE_API_TOKEN")
        if token_from_file:
            os.environ["REPLICATE_API_TOKEN"] = token_from_file
            token = token_from_file

    if not token:
        raise SystemExit("Replicate API token not found. Add REPLICATE_API_TOKEN to .env.local or export it before running this script.")

    raw_markdown = load_markdown_text()
    cleaned_text = clean_markdown(raw_markdown)
    if not cleaned_text:
        raise SystemExit("No text remained after cleaning the markdown input.")

    chunks = chunk_text(cleaned_text)
    if not chunks:
        raise SystemExit("Text chunking produced no segments to synthesize.")

    print(f"Prepared {len(chunks)} text chunk(s) for synthesis.")

    for index, chunk in enumerate(chunks, start=1):
        print(f"[chunk {index}/{len(chunks)}] Submitting {len(chunk)} characters to Replicate.")
        try:
            prediction = create_prediction(chunk, token)
        except Exception as exc:
            raise RuntimeError(f"Chunk {index} failed to synthesize: {exc}") from exc

        urls = collect_audio_urls(prediction.get("output"))
        print(f"[chunk {index}] Received {len(urls)} audio segment URL(s).")

        for segment_index, url in enumerate(urls, start=1):
            filename = f"output_segment_{index}_{segment_index}.wav"
            print(f"[download] Saving segment {segment_index} for chunk {index} to '{filename}'.")
            download_audio(url, filename)

    print("All chunks processed successfully.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)