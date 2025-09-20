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