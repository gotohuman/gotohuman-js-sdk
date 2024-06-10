import GoToHuman from "./gth";

class AiFlow {
  constructor({
    onTrigger,
    agentId,
    fetch
  }) {
    this.steps = [];
    this.onTrigger = onTrigger;
    this.agentId = agentId;
    this.fetch = fetch;
  }

  step({id, name = null, options = {}, fn}) {
    if (id == undefined || fn == undefined)
      throw new Error('id and fn are required');
    if (this.steps.findIndex((val) => val.id == id) >= 0)
      throw new Error('task id needs to be unique');
    const stepFn = async(args) => {
      await this.gth.startedTask({id: id, name: name})
      const result = await fn(args);
      await this.gth.completedTask({id: id, name: name, result: result})
      return result;
    }
    this.steps.push({ id, name, stepFn });
  }

  gotoHuman({id, name = null, options = {}}) {
    const stepFn = async({input}) => {
      console.log(`gotoHuman for input ${typeof input}: ${input}`);
      const actionValuesToSend = Array.isArray(input) ? input : [input];
      console.log(`gotoHuman send actionValues: ${JSON.stringify(actionValuesToSend)}`);
      if (!!options && options.onlyServeResults) {
        await this.gth.serveToHuman({taskId: id, taskName: name, actionValues: actionValuesToSend})
      } else {
        await this.gth.requestHumanApproval({taskId: id, taskName: name, actionValues: actionValuesToSend, ...(!!options && (options.allowEditing != null) && {allowEditing: options.allowEditing})})
      }
      return null;
    }
    this.steps.push({ id, name, stepFn, interrupt: true });
  }

  async executeSteps({apiKey, agentId, triggerEvent, runId, actionValues, taskId, humanResponse}) {
    if (!!agentId && (agentId !== this.agentId)) return null; //agentId explicitely targeted, but its not this agent
    if (!!triggerEvent && (triggerEvent !== this.onTrigger)) return null; // there is a triggerEvent but its not for this agent
    try {
      this.gth = new GoToHuman({apiKey: apiKey, agentId: this.agentId, ...(runId && {agentRunId: runId}), fetch: this.fetch })
      console.log("start flow")
      const comingFromUserDecision = !!humanResponse;
      if (!comingFromUserDecision && this.onTrigger != undefined)
        await this.gth.completedTask({id: this.onTrigger, result: JSON.stringify(actionValues)})
      let stepInput = actionValues;
      console.log(`comingFromUserDecision ${comingFromUserDecision} taskId ${taskId} taskIndex ${this.steps.findIndex(val => val.id === taskId)}`)
      const firstStepToRun = comingFromUserDecision ? (this.steps.findIndex(val => val.id === taskId) + 1) : 0;
      console.log(`firstStepToRun ${firstStepToRun} of entries ${this.steps}`)
      const stepsQueued = this.steps.slice(firstStepToRun);
      for (const [index, step] of stepsQueued.entries()) {
        console.log(`run step ${index} ${step.id}`)
        stepInput = await step.stepFn({ flow: this, input: stepInput, infos: {approved: (!!humanResponse && (humanResponse == 'human_approved'))} });
        if (step.interrupt) break;
        if (index == (stepsQueued.length - 1))
          await this.gth.archive();
      }
      return {success: true, ...(stepInput && {lastResult: stepInput})};
    } catch (err) {
      return {error: true, errorMsg: err.message}
    }
  }
}
export default AiFlow;