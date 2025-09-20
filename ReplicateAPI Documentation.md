## Basic model info

Model name: minimax/speech-02-turbo
Model description: Text-to-Audio (T2A) that offers voice synthesis, emotional expression, and multilingual capabilities. Designed for real-time applications with low latency


## Model inputs

- text (required): Text to convert to speech. Every character is 1 token. Maximum 5000 characters. Use <#x#> between words to control pause duration (0.01-99.99s). (string)
- voice_id (optional): Desired voice ID. Use a voice ID you have trained (https://replicate.com/minimax/voice-cloning), or one of the following system voice IDs: Wise_Woman, Friendly_Person, Inspirational_girl, Deep_Voice_Man, Calm_Woman, Casual_Guy, Lively_Girl, Patient_Man, Young_Knight, Determined_Man, Lovely_Girl, Decent_Boy, Imposing_Manner, Elegant_Man, Abbess, Sweet_Girl_2, Exuberant_Girl (string)
- speed (optional): Speech speed (number)
- volume (optional): Speech volume (number)
- pitch (optional): Speech pitch (integer)
- emotion (optional): Speech emotion (string)
- english_normalization (optional): Enable English text normalization for better number reading (slightly increases latency) (boolean)
- sample_rate (optional): Sample rate for the generated speech (integer)
- bitrate (optional): Bitrate for the generated speech (integer)
- channel (optional): Number of audio channels (string)
- language_boost (optional): Enhance recognition of specific languages and dialects (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/by67sg9dxdrm80cpjat9x3apxw)

#### Input

```json
{
  "text": "Speech-02-series is a Text-to-Audio and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.\n\nThe HD version is optimized for high-fidelity applications like voiceovers and audiobooks. While the turbo one is designed for real-time applications with low latency.\n\nWhen using this model on Replicate, each character represents 1 token.",
  "pitch": 0,
  "speed": 1,
  "volume": 1,
  "bitrate": 128000,
  "channel": "mono",
  "emotion": "angry",
  "voice_id": "Deep_Voice_Man",
  "sample_rate": 32000,
  "language_boost": "English",
  "english_normalization": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/SnPxXgl26yaAApm29BJpcHRl5PyxHAxpDt97TP59rPiFeWUKA/tmp517d49p_.mp3"
```


## Model readme

> # Speech-02-series
> 
> Speech-02-series is a Text-to-Audio (T2A) and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.
> 
> ## Models
> 
> - **[Speech-02-HD](https://replicate.com/minimax/speech-02-hd)**: Optimized for high-fidelity applications like voiceovers and audiobooks
> - **[Speech-02-Turbo](https://replicate.com/minimax/speech-02-turbo)**: Designed for real-time applications with low latency
> - **[Voice-Cloning](https://replicate.com/minimax/voice-cloning)**: Clone voices for use with speech-02-hd and speech-02-turbo
> 
> ## Key Features
> 
> ### Voice Cloning
> 
> - 10-second voice cloning with 99% reported vocal similarity
> - 300+ pre-built voices across different demographics
> - Controls for pitch, speed, and volume
> 
> ### Emotion Control
> 
> - Auto-detect mode that matches emotional tone to text context
> - Manual customization options for emotional expression
> 
> ### Language Support
> 
> - 30+ languages with native accents
> - English variants: US, UK, Australian, Indian
> - Asian languages: Mandarin, Cantonese, Japanese, Korean, Vietnamese, Indonesian
> - European languages: French, German, Spanish, Portuguese (Brazilian), Turkish, Russian, Ukrainian
> - Recently added: Thai, Polish, Romanian, Greek, Czech, Finnish, Hindi
> 
> ## Technical Specifications
> 
> ### Deployment
> 
> - Virtual machine and private cloud deployment options
> - Isolated environment for security and privacy
> 
> ## Privacy policy
> 
> Data from this model is sent from Replicate to MiniMax.
> 
> Check their Privacy Policy for details:
> 
> https://intl.minimaxi.com/protocol/privacy-policy
> 
> ## Terms of Service
> 
> https://intl.minimaxi.com/protocol/terms-of-service
> 
> ## MiniMax TTS Voice List
> 
> A complete list of pre-trained voices available for us with the hd and turbo models:
> 
> - English_Trustworth_Man
> - English_Aussie_Bloke
> - English_CalmWoman
> - English_UpsetGirl
> - English_Gentle-voiced_man
> - English_Whispering_girl
> - English_Diligent_Man
> - English_Graceful_Lady
> - English_ReservedYoungMan
> - English_PlayfulGirl
> - English_ManWithDeepVoice
> - English_MaturePartner
> - English_FriendlyPerson
> - English_MatureBoss
> - English_Debator
> - English_LovelyGirl
> - English_Steadymentor
> - English_Deep-VoicedGentleman
> - English_Wiselady
> - English_CaptivatingStoryteller
> - English_DecentYoungMan
> - English_SentimentalLady
> - English_ImposingManner
> - English_SadTeen
> - English_PassionateWarrior
> - English_WiseScholar
> - English_Soft-spokenGirl
> - English_SereneWoman
> - English_ConfidentWoman
> - English_PatientMan
> - English_Comedian
> - English_BossyLeader
> - English_Strong-WilledBoy
> - English_StressedLady
> - English_AssertiveQueen
> - English_AnimeCharacter
> - English_Jovialman
> - English_WhimsicalGirl
> - English_Kind-heartedGirl


General Replicate API Guidance
Headers

    Preferstring

    Leave the request open and wait for the model to finish generating output. Set to wait=n where n is a number of seconds between 1 and 60.

    See https://replicate.com/docs/topics/predictions/create-a-prediction#sync-mode for more information.

Request body

    inputobjectRequired

    The model's input as a JSON object. The input schema depends on what model you are running. To see the available inputs, click the "API" tab on the model you are running or get the model version and look at its openapi_schema property. For example, stability-ai/sdxl takes prompt as an input.

    Files should be passed as HTTP URLs or data URLs.

    Use an HTTP URL when:
        you have a large file > 256kb
        you want to be able to use the file multiple times
        you want your prediction metadata to be associable with your input files

    Use a data URL when:
        you have a small file <= 256kb
        you don't want to upload and host the file somewhere
        you don't need to use the file again (Replicate will not store it)

webhookstring

An HTTPS URL for receiving a webhook when the prediction has new output. The webhook will be a POST request where the request body is the same as the response body of the get prediction operation. If there are network problems, we will retry the webhook a few times, so make sure it can be safely called more than once. Replicate will not follow redirects when sending webhook requests to your service, so be sure to specify a URL that will resolve without redirecting.
webhook_events_filterarray

By default, we will send requests to your webhook URL whenever there are new outputs or the prediction has finished. You can change which events trigger webhook requests by specifying webhook_events_filter in the prediction request:

    start: immediately on prediction start
    output: each time a prediction generates an output (note that predictions can generate multiple outputs)
    logs: each time log output is generated by a prediction
    completed: when the prediction reaches a terminal state (succeeded/canceled/failed)

For example, if you only wanted requests to be sent at the start and end of the prediction, you would provide:

{
  "version": "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
  "input": {
    "text": "Alice"
  },
  "webhook": "https://example.com/my-webhook",
  "webhook_events_filter": ["start", "completed"]
}

Requests for event types output and logs will be sent at most once every 500ms. If you request start and completed webhooks, then they'll always be sent regardless of throttling.

Make a prediction example
import { writeFile } from "fs/promises";
import Replicate from "replicate";
const replicate = new Replicate();

const input = {
    text: "Speech-02-series is a Text-to-Audio and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.\n\nThe HD version is optimized for high-fidelity applications like voiceovers and audiobooks. While the turbo one is designed for real-time applications with low latency.\n\nWhen using this model on Replicate, each character represents 1 token.",
    emotion: "angry",
    voice_id: "Deep_Voice_Man",
    language_boost: "English",
    english_normalization: true
};

const output = await replicate.run("minimax/speech-02-turbo", { input });

// To access the file URL:
console.log(output.url());
//=> "https://replicate.delivery/.../output.mp3"

// To write the file to disk:
await writeFile("output.mp3", output);
//=> output.mp3 written to disk


Prediction lifecycle

Running predictions and trainings can often take significant time to complete, beyond what is reasonable for an HTTP request/response.

When you run a model on Replicate, the prediction is created with a “starting” state, then instantly returned. This will then move to "processing" and eventual one of “successful”, "failed" or "canceled".
Starting
Running
Succeeded
Failed
Canceled

You can explore the prediction lifecycle by using the predictions.get() method to retrieve the latest version of the prediction until completed.
Show example

const input = {
    text: "Speech-02-series is a Text-to-Audio and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.\n\nThe HD version is optimized for high-fidelity applications like voiceovers and audiobooks. While the turbo one is designed for real-time applications with low latency.\n\nWhen using this model on Replicate, each character represents 1 token.",
    emotion: "angry",
    voice_id: "Deep_Voice_Man",
    language_boost: "English",
    english_normalization: true
};
const prediction = await replicate.predictions.create({
  model: "minimax/speech-02-turbo",
  input
});
// { "id": "xyz...", "status": "starting", ... }

const latest = await replicate.predictions.get(prediction.id);
// { "id": "xyz...", "status": "processing", ... }

let completed;
for (let i = 0; i < 5; i++) {
  const latest = await replicate.predictions.get(prediction.id);
  if (latest.status !== "starting" && latest.status !== "processing") {
    completed = latest;
    break;
  }
  // Wait for 2 seconds and then try again.
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.log(completed.output);
//=> output.mp3 written to disk

Webhooks

Webhooks provide real-time updates about your prediction. Specify an endpoint when you create a prediction, and Replicate will send HTTP POST requests to that URL when the prediction is created, updated, and finished.

It is possible to provide a URL to the predictions.create() function that will be requested by Replicate when the prediction status changes. This is an alternative to polling.

To receive webhooks you’ll need a web server. The following example uses Hono, a web standards based server, but this pattern applies to most frameworks.
Show example

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();
app.get('/webhooks/replicate', async (c) => {
  // Get the prediction from the request.
  const prediction = await c.req.json();
	console.log(prediction);
  //=> {"id": "xyz", "status": "successful", ... }

  // Acknowledge the webhook.
  c.status(200);
  c.json({ok: true});
}));

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
  //=> Listening on http://localhost:3000
});

Then create the prediction passing in the webhook URL and specify which events you want to receive out of "start", "output", ”logs” and "completed".

const input = {
    text: "Speech-02-series is a Text-to-Audio and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.\n\nThe HD version is optimized for high-fidelity applications like voiceovers and audiobooks. While the turbo one is designed for real-time applications with low latency.\n\nWhen using this model on Replicate, each character represents 1 token.",
    emotion: "angry",
    voice_id: "Deep_Voice_Man",
    language_boost: "English",
    english_normalization: true
};

const callbackURL = `https://my.app/webhooks/replicate`;
await replicate.predictions.create({
  model: "minimax/speech-02-turbo",
  input: input,
  webhook: callbackURL,
  webhook_events_filter: ["completed"],
});

// The server will now handle the event and log:
// => {"id": "xyz", "status": "successful", ... }

ℹ️ The replicate.run() method is not used here. Because we're using webhooks, and we don’t need to poll for updates.

Co-ordinating between a prediction request and a webhook response will require some glue. A simple implementation for a single JavaScript server could use an event emitter to manage this.

Show example

import { EventEmitter } from "node:events";
const webhooks = new EventEmitter();

// In server code, emit the prediction on the event emitter.
app.get('/webhooks/replicate', async (c) => {
  const prediction = await c.req.json();

  // Emit the prediction on the EventEmitter.
  webhooks.emit(prediction.id, prediction)

  // ...
}));

// In request code
await replicate.predictions.create({
  model: "yorickvp/llava-13b",
  version: "a0fdc44e4f2e1f20f2bb4e27846899953ac8e66c5886c5878fa1d6b73ce009e5",
  input: input,
  webhook: callbackURL,
  webhook_events_filter: ["completed"],
});

// Wait for prediction to be emitted on the EventEmitter.
const prediction = await new Promise(resolve => webhooks.addEventListener(prediction.id, resolve));
// {"id": "xyz", "status": "successful", ... }

From a security perspective it is also possible to verify that the webhook came from Replicate. Check out our documentation on verifying webhooks for more information.

Access a prediction

You may wish to access the prediction object. In these cases it’s easier to use the replicate.predictions.create() or replicate.deployments.predictions.create() functions which will return the prediction object.

Though note that these functions will only return the created prediction, and it will not wait for that prediction to be completed before returning. Use replicate.predictions.get() to fetch the latest prediction.

const input = {
    text: "Speech-02-series is a Text-to-Audio and voice cloning technology that offers voice synthesis, emotional expression, and multilingual capabilities.\n\nThe HD version is optimized for high-fidelity applications like voiceovers and audiobooks. While the turbo one is designed for real-time applications with low latency.\n\nWhen using this model on Replicate, each character represents 1 token.",
    emotion: "angry",
    voice_id: "Deep_Voice_Man",
    language_boost: "English",
    english_normalization: true
};
const prediction = replicate.predictions.create({
  model: "minimax/speech-02-turbo",
  input
});
// { "id": "xyz123", "status": "starting", ... }



# Replicate Documentation for Whisper Speech to Text
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

# Incredibly Fast Whisper API Documentation
## Basic model info

Model name: vaibhavs10/incredibly-fast-whisper
Model description: whisper-large-v3, incredibly fast, powered by Hugging Face Transformers! 🤗


## Model inputs

- audio (required): Audio file (string)
- task (optional): Task to perform: transcribe or translate to another language. (string)
- language (optional): Language spoken in the audio, specify 'None' to perform language detection. (string)
- batch_size (optional): Number of parallel batches you want to compute. Reduce if you face OOMs. (integer)
- timestamp (optional): Whisper supports both chunked as well as word level timestamps. (string)
- diarise_audio (optional): Use Pyannote.audio to diarise the audio clips. You will need to provide hf_token below too. (boolean)
- hf_token (optional): Provide a hf.co/settings/token for Pyannote.audio to diarise the audio clips. You need to agree to the terms in 'https://huggingface.co/pyannote/speaker-diarization-3.1' and 'https://huggingface.co/pyannote/segmentation-3.0' first. (string)


## Model output schema

{
  "title": "Output"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/vplzxotbmrsqbd7hsbehoaugaa)

#### Input

```json
{
  "task": "transcribe",
  "audio": "https://replicate.delivery/pbxt/Js23CcyeLEntZWRsPsAVcfXZLMX11DeRtozHMs1ecC8JRph9/sam_altman_lex_podcast_367.flac",
  "batch_size": 64,
  "return_timestamps": true
}
```

#### Output

```json
{
  "text": " We have been a misunderstood and badly mocked org for a long time. When we started, we announced the org at the end of 2015 and said we were going to work on AGI. People thought we were batshit insane. I remember at the time, an eminent AI scientist at a large industrial AI lab was like DMing individual reporters being like, you know, these people aren't very good and it's ridiculous to talk about AGI and I can't believe you're giving them time of day. And it's like, that was the level of like pettiness and rancor in the field at a new group of people saying we're going to try to build AGI. So OpenAI and DeepMind was a small collection of folks who were brave enough to talk about AGI in the face of mockery. We don't get mocked as much now. Don't get mocked as much now. of OpenAI, the company behind GPT-4, JAD-GPT, DALI, Codex, and many other AI technologies, which both individually and together constitute some of the greatest breakthroughs in the history of artificial intelligence, computing, and humanity in general. Please allow me to say a few words about the possibilities and the dangers of AI in this current moment in the history of human civilization. I believe it is a critical moment. We stand on the precipice of fundamental societal transformation, where soon, nobody knows when, but many, including me, believe it's within our lifetime. The collective intelligence of the human species begins to pale in comparison, intelligence of the human species begins to pale in comparison, by many orders of magnitude, to the general superintelligence in the AI systems we build and deploy at scale. This is both exciting and terrifying.