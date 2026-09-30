<div align="center">

<img src="./img/logo.png" alt="gotoHuman Logo" width="360px"/>

</div>

# gotoHuman - Human in the Loop for AI workflows

[![MIT License](https://img.shields.io/badge/License-MIT-red.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![npm Version](https://img.shields.io/npm/v/gotohuman?style=flat-square)](https://github.com/gotohuman/gotohuman-js-sdk)
[![GitHub Repo stars](https://img.shields.io/github/stars/gotohuman?style=flat-square&logo=GitHub&label=gotohuman)](https://github.com/langfuse/langfuse)
[![Discord](https://img.shields.io/discord/1301983673616171090?style=flat-square&logo=Discord&logoColor=white&label=Discord&color=%23434EE4)](https://discord.gg/yDSQtf2SSg)

[gotoHuman](https://gotohuman.com) helps you build production-ready AI workflows by making it really easy to include human approvals. Keep a human in the loop to review AI‑generated content, approve critical actions or provide input.

Set up a fully customized review step capturing any relevant data (text, images, markdown,...) and required human input (buttons, checkboxes, inputs,...). Then trigger it from your application whenever human review from your team is needed.

### Install

`npm install gotohuman`

### Init

Set environment variables with your gotoHuman API key and the ID of your [agent](https://docs.gotohuman.com/agent-setup):

```bash
GOTOHUMAN_API_KEY=YOUR_API_KEY
GOTOHUMAN_AGENT_ID=YOUR_AGENT_ID
```

```js
import { GotoHuman } from 'gotohuman'

const gotoHuman = new GotoHuman()
```

### Send request

[Read the docs](https://docs.gotohuman.com/send-requests) for more details.

Pass the ID of the review type created in gotoHuman.

Example request:
```js
const reviewRequest = gotoHuman.createReview("YOUR_REVIEW_TYPE_ID")
  .setReviewData({
    "example1": "value1",
    "example2": true,
  })
  .setReviewConfig({...})
  .setMetaData({...})

await reviewRequest.sendRequest()
```

#### Example review

![gotoHuman - Human approval example](./img/repo-review-example.jpg)