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

```
const gotoHuman = new GotoHuman(GOTOHUMAN_API_KEY)
```

### Send request

[Read the docs](https://docs.gotohuman.com/send-requests) for more details.

Pass the review template ID from your gotoHuman dashboard.

Example request:
```
const reviewRequest = gotoHuman.createReview(GOTOHUMAN_TEMPLATE_ID)
    .setReviewData({
        exampleField1: value1,
        exampleField2: value2,
    })
    .addMetaData("threadId", threadId)
    .assignToUsers(["jess@acme.org"])
await reviewRequest.sendRequest()
```

Optionally, set a title, webhook URL, auto-approve flag, or workflow config on the request:
```
const reviewRequest = gotoHuman.createReview(GOTOHUMAN_TEMPLATE_ID)
    .setReviewData({ ... })
    .setReviewConfig({ someConfigKey: "value" })
    .setTitle("Review AI draft")
    .setWebhookUrl("https://your-app.com/webhook")
    .setAutoApprove(false)
    .setWorkflow({ runId: "abc123" })
await reviewRequest.sendRequest()
```

#### Example review

![gotoHuman - Human approval example](./img/repo-review-example.jpg)