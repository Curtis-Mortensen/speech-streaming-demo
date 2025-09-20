# Whisper STT – Local Integration Overview

- Model slug: `openai/whisper` with input.model = `large-v3` (baseline)
- Local route implementation: [src/app/api/stt/route.ts](src/app/api/stt/route.ts)
- Version reference (informational): large-v3 version hash as listed on Replicate:
  - `3c08daf437fe359eb158a5123c395673f0a113dd8b4bd01ddce5936850e2a981`

## Example request to Replicate (server-side)

```ts
// Pseudocode using Replicate SDK
const prediction = await replicate.predictions.create({
  model: "openai/whisper",
  input: {
    audio: "<http-url-or-data-url>", // either a hosted file URL or a data URL
    model: "large-v3",
    language: "auto",
    translate: false,
    transcription: "plain text",
    // optional: initial_prompt: "domain or biasing hint"
  },
});
```

Notes:
- audio may be either an HTTP URL (recommended for >256KB or reuse) or a `data:` URL (good for small files).
- The local route will normalize output to a single transcript string.

## Local Integration

- Endpoint: POST `/api/stt`
- Content-Type: `multipart/form-data`
- Field name: `audio` (single file)
- Optional fields:
  - `language`: e.g. "en" (defaults to "auto")
  - `prompt`: optional biasing hint (mapped to `initial_prompt`)

Quick test:

```bash
curl -X POST http://localhost:3000/api/stt -F "audio=@public/test.webm;type=audio/webm"
```

- See implementation in [src/app/api/stt/route.ts](src/app/api/stt/route.ts)

## Accepted MIME types

Validated in the local route (preferred first):
- `audio/webm` (webm/opus preferred)
- `audio/ogg` (some devices label Opus as OGG)
- `audio/wav`, `audio/x-wav`
- `audio/m4a`, `audio/x-m4a`, `audio/mp4`

## Upload behavior

The local route first attempts `replicate.files.upload(...)` (if available in the installed SDK) to obtain a hosted input URL. If not available or it fails, it falls back to generating a `data:` URL for the audio blob (recommended by Replicate for files <= 256KB). See details in [src/app/api/stt/route.ts](src/app/api/stt/route.ts).

## Output normalization

The route returns a normalized JSON shape:

```json
{ "transcript": "string", "language": "optional", "durationMs": 1234 }
```

Normalization logic:
- Prefer `transcription` (string) or `text` (string) if present.
- If segments are returned, their `text` values are joined with spaces.
- Leading/trailing whitespace is trimmed. If no transcript can be derived, a 502 is returned.

---
## Basic model info

Model name: openai/whisper
Model description: Convert speech in audio to text


## Model inputs

- audio (required): Audio file (string)
- transcription (optional): Choose the format for the transcription (string)
- translate (optional): Translate the text to English when set to True (boolean)
- language (optional): Language spoken in the audio, specify 'auto' for automatic language detection (string)
- temperature (optional): temperature to use for sampling (number)
- patience (optional): optional patience value to use in beam decoding, as in https://arxiv.org/abs/2204.05424, the default (1.0) is equivalent to conventional beam search (number)
- suppress_tokens (optional): comma-separated list of token ids to suppress during sampling; '-1' will suppress most special characters except common punctuations (string)
- initial_prompt (optional): optional text to provide as a prompt for the first window. (string)
- condition_on_previous_text (optional): if True, provide the previous output of the model as a prompt for the next window; disabling may make the text inconsistent across windows, but the model becomes less prone to getting stuck in a failure loop (boolean)
- temperature_increment_on_fallback (optional): temperature to increase when falling back when the decoding fails to meet either of the thresholds below (number)
- compression_ratio_threshold (optional): if the gzip compression ratio is higher than this value, treat the decoding as failed (number)
- logprob_threshold (optional): if the average log probability is lower than this value, treat the decoding as failed (number)
- no_speech_threshold (optional): if the probability of the <|nospeech|> token is higher than this value AND the decoding has failed due to `logprob_threshold`, consider the segment as silence (number)


## Model output schema

{
  "type": "object",
  "title": "Output",
  "required": [
    "detected_language",
    "transcription"
  ],
  "properties": {
    "segments": {
      "title": "Segments"
    },
    "srt_file": {
      "type": "string",
      "title": "Srt File",
      "format": "uri"
    },
    "txt_file": {
      "type": "string",
      "title": "Txt File",
      "format": "uri"
    },
    "translation": {
      "type": "string",
      "title": "Translation"
    },
    "transcription": {
      "type": "string",
      "title": "Transcription"
    },
    "detected_language": {
      "type": "string",
      "title": "Detected Language"
    }
  }
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/4bzv3trbxdeyon73ve6itzvycq)

#### Input

```json
{
  "audio": "https://replicate.delivery/mgxm/e5159b1b-508a-4be4-b892-e1eb47850bdc/OSR_uk_000_0050_8k.wav",
  "model": "large-v3",
  "translate": false,
  "temperature": 0,
  "transcription": "plain text",
  "suppress_tokens": "-1",
  "logprob_threshold": -1,
  "no_speech_threshold": 0.6,
  "condition_on_previous_text": true,
  "compression_ratio_threshold": 2.4,
  "temperature_increment_on_fallback": 0.2
}
```

#### Output

```json
{
  "segments": [
    {
      "id": 0,
      "end": 18.6,
      "seek": 0,
      "text": " the little tales they tell are false the door was barred locked and bolted as well ripe pears are fit for a queen's table a big wet stain was on the round carpet",
      "start": 0,
      "tokens": [
        50365,
        264,
        707,
        27254,
        436,
        980,
        366,
        7908,
        264,
        2853,
        390,
        2159,
        986,
        9376,
        293,
        13436,
        292,
        382,
        731,
        31421,
        520,
        685,
        366,
        3318,
        337,
        257,
        12206,
        311,
        3199,
        257,
        955,
        6630,
        16441,
        390,
        322,
        264,
        3098,
        18119,
        51295
      ],
      "avg_logprob": -0.060722851171726135,
      "temperature": 0,
      "no_speech_prob": 0.05907342955470085,
      "compression_ratio": 1.412280701754386
    },
    {
      "id": 1,
      "end": 31.840000000000003,
      "seek": 1860,
      "text": " the kite dipped and swayed but stayed aloft the pleasant hours fly by much too soon the room was crowded with a mild wab",
      "start": 18.6,
      "tokens": [
        50365,
        264,
        38867,
        45162,
        293,
        27555,
        292,
        457,
        9181,
        419,
        6750,
        264,
        16232,
        2496,
        3603,
        538,
        709,
        886,
        2321,
        264,
        1808,
        390,
        21634,
        365,
        257,
        15154,
        261,
        455,
        51027
      ],
      "avg_logprob": -0.1184891973223005,
      "temperature": 0,
      "no_speech_prob": 0.000253104604780674,
      "compression_ratio": 1.696969696969697
    },
    {
      "id": 2,
      "end": 45.2,
      "seek": 1860,
      "text": " the room was crowded with a wild mob this strong arm shall shield your honour she blushed when he gave her a white orchid",
      "start": 31.840000000000003,
      "tokens": [
        51027,
        264,
        1808,
        390,
        21634,
        365,
        257,
        4868,
        4298,
        341,
        2068,
        3726,
        4393,
        10257,
        428,
        20631,
        750,
        25218,
        292,
        562,
        415,
        2729,
        720,
        257,
        2418,
        34850,
        327,
        51695
      ],
      "avg_logprob": -0.1184891973223005,
      "temperature": 0,
      "no_speech_prob": 0.000253104604780674,
      "compression_ratio": 1.696969696969697
    },
    {
      "id": 3,
      "end": 48.6,
      "seek": 1860,
      "text": " the beetle droned in the hot june sun",
      "start": 45.2,
      "tokens": [
        51695,
        264,
        49735,
        1224,
        19009,
        294,
        264,
        2368,
        361,
        2613,
        3295,
        51865
      ],
      "avg_logprob": -0.1184891973223005,
      "temperature": 0,
      "no_speech_prob": 0.000253104604780674,
      "compression_ratio": 1.696969696969697
    },
    {
      "id": 4,
      "end": 52.38,
      "seek": 4860,
      "text": " the beetle droned in the hot june sun",
      "start": 48.6,
      "tokens": [
        50365,
        264,
        49735,
        1224,
        19009,
        294,
        264,
        2368,
        361,
        2613,
        3295,
        50554
      ],
      "avg_logprob": -0.30115177081181455,
      "temperature": 0.2,
      "no_speech_prob": 0.292143315076828,
      "compression_ratio": 0.8409090909090909
    }
  ],
  "translation": null,
  "transcription": " the little tales they tell are false the door was barred locked and bolted as well ripe pears are fit for a queen's table a big wet stain was on the round carpet the kite dipped and swayed but stayed aloft the pleasant hours fly by much too soon the room was crowded with a mild wab the room was crowded with a wild mob this strong arm shall shield your honour she blushed when he gave her a white orchid the beetle droned in the hot june sun the beetle droned in the hot june sun",
  "detected_language": "english"
}
```


### Example (https://replicate.com/p/dwt7py202drga0cgw1yt8qkb90)

#### Input

```json
{
  "audio": "https://replicate.delivery/pbxt/LJr3aqYueyyKOKkIwWWIH67SyvzrAKfCm5tNVYc3uSt7oWy4/4th-dimension-explained-by-a-high-school-student.mp3",
  "model": "large-v3",
  "language": "auto",
  "translate": false,
  "temperature": 0,
  "transcription": "plain text",
  "suppress_tokens": "-1",
  "logprob_threshold": -1,
  "no_speech_threshold": 0.6,
  "condition_on_previous_text": true,
  "compression_ratio_threshold": 2.4,
  "temperature_increment_on_fallback": 0.2
}
```

#### Output

```json
{
  "segments": [
    {
      "id": 0,
      "end": 3.92,
      "seek": 0,
      "text": " Imagine that this folder is a dimensional plane.",
      "start": 1,
      "tokens": [
        50415,
        11739,
        300,
        341,
        10820,
        307,
        257,
        18795,
        5720,
        13,
        50561
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 1,
      "end": 7.6000000000000005,
      "seek": 0,
      "text": " Now, assuming that it has no height and no depth, what would this mean?",
      "start": 3.92,
      "tokens": [
        50561,
        823,
        11,
        11926,
        300,
        309,
        575,
        572,
        6681,
        293,
        572,
        7161,
        11,
        437,
        576,
        341,
        914,
        30,
        50745
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 2,
      "end": 10.68,
      "seek": 0,
      "text": " It would mean that it's a one-dimensional world.",
      "start": 7.6000000000000005,
      "tokens": [
        50745,
        467,
        576,
        914,
        300,
        309,
        311,
        257,
        472,
        12,
        18759,
        1002,
        13,
        50899
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 3,
      "end": 15.280000000000001,
      "seek": 0,
      "text": " So if, hypothetically, an organism was living inside of it, it would only be able to move",
      "start": 10.68,
      "tokens": [
        50899,
        407,
        498,
        11,
        24371,
        22652,
        11,
        364,
        24128,
        390,
        2647,
        1854,
        295,
        309,
        11,
        309,
        576,
        787,
        312,
        1075,
        281,
        1286,
        51129
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 4,
      "end": 19.240000000000002,
      "seek": 0,
      "text": " in a linear path forward and backwards, in a straight line.",
      "start": 15.280000000000001,
      "tokens": [
        51129,
        294,
        257,
        8213,
        3100,
        2128,
        293,
        12204,
        11,
        294,
        257,
        2997,
        1622,
        13,
        51327
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 5,
      "end": 23.94,
      "seek": 0,
      "text": " Now, if we go to the second dimension, we have two dimensions.",
      "start": 19.240000000000002,
      "tokens": [
        51327,
        823,
        11,
        498,
        321,
        352,
        281,
        264,
        1150,
        10139,
        11,
        321,
        362,
        732,
        12819,
        13,
        51562
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 6,
      "end": 26,
      "seek": 0,
      "text": " We have width and we have length.",
      "start": 23.94,
      "tokens": [
        51562,
        492,
        362,
        11402,
        293,
        321,
        362,
        4641,
        13,
        51665
      ],
      "avg_logprob": -0.1921603744094436,
      "temperature": 0,
      "no_speech_prob": 0.006485220044851303,
      "compression_ratio": 1.6842105263157894
    },
    {
      "id": 7,
      "end": 30.62,
      "seek": 2600,
      "text": " So hypothetically, if an organism lived inside of here, then it would be able to move up,",
      "start": 26,
      "tokens": [
        50365,
        407,
        24371,
        22652,
        11,
        498,
        364,
        24128,
        5152,
        1854,
        295,
        510,
        11,
        550,
        309,
        576,
        312,
        1075,
        281,
        1286,
        493,
        11,
        50596
      ],
      "avg_logprob": -0.1291365924182239,
      "temperature": 0.2,
      "no_speech_prob": 8.613757381681353e-05,
      "compression_ratio": 1.8860759493670887
    }
  ]
}

## Model readme

> # Whisper Large-v3
> 
> Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multi-task model that can perform multilingual speech recognition, translation, and language identification.
> 
> This version runs only the most recent Whisper model, `large-v3`. It's optimized for high performance and simplicity.
> 
> ## Model Versions
> 
> | Model Size | Version | 
> | ---  | --- | 
> | large-v3 | [link](https://replicate.com/openai/whisper/versions/3c08daf437fe359eb158a5123c395673f0a113dd8b4bd01ddce5936850e2a981) |
> | large-v2 | [link](https://replicate.com/openai/whisper/versions/e39e354773466b955265e969568deb7da217804d8e771ea8c9cd0cef6591f8bc) |
> | all others | [link](https://replicate.com/openai/whisper/versions/30414ee7c4fffc37e260fcab7842b5be470b9b840f2b608f5baa9bbef9a259ed) | 
> 
> While this implementation only uses the `large-v3` model, we maintain links to previous versions for reference.
> 
> For users who need different model sizes, check out our [multi-model version](https://replicate.com/zsxkib/whisper-lazyloading).
> 
> ## Model Description
> 
> ![Approach](https://github.com/openai/whisper/blob/main/approach.png?raw=true)
> 
> Whisper uses a Transformer sequence-to-sequence model trained on various speech processing tasks, including multilingual speech recognition, speech translation, spoken language identification, and voice activity detection. All of these tasks are jointly represented as a sequence of tokens to be predicted by the decoder, allowing for a single model to replace many different stages of a traditional speech processing pipeline.
> 
> [[Blog]](https://openai.com/blog/whisper)
> [[Paper]](https://cdn.openai.com/papers/whisper.pdf)
> [[Model card]](model-card.md)
> 
> ## License
> 
> The code and model weights of Whisper are released under the MIT License. See [LICENSE](https://github.com/openai/whisper/blob/main/LICENSE) for further details.
> 
> ## Citation
> 
> ```
> @misc{https://doi.org/10.48550/arxiv.2212.04356,
>   doi = {10.48550/ARXIV.2212.04356},
>   url = {https://arxiv.org/abs/2212.04356},
>   author = {Radford, Alec and Kim, Jong Wook and Xu, Tao and Brockman, Greg and McLeavey, Christine and Sutskever, Ilya},
>   title = {Robust Speech Recognition via Large-Scale Weak Supervision},
>   publisher = {arXiv},
>   year = {2022},
>   copyright = {arXiv.org perpetual, non-exclusive license}
> }
```

### File Inputs on Replicate
Some models accept files as input, like images, audio, or video, zip files, PDFs, etc.

There are multiple ways to use files as input when running a model on Replicate. You can provide a file as input using a URL, a local file on your computer, or a base64-encoded object.

[](#option-1-hosted-file)Option 1: Hosted file
----------------------------------------------

Use a URL to provide a hosted file:

This is useful if you already have a file hosted somewhere on the internet.

[](#option-2-local-file)Option 2: Local file
--------------------------------------------

You can provide Replicate with a `Blob`, `File`, or `Buffer` object, and the library will handle the upload for you. This will work for files up to 100MB:

[](#option-3-data-uri)Option 3: Data URI
----------------------------------------

Create a data URI consisting of the base64 encoded data for your file. This is only recommended if the file is less than 1MB:

[](#using-the-file-input)Using the file input
---------------------------------------------

Once you have your file input ready, you can use it in your prediction: