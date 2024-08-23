import * as GTH from "./gth.js";
export import FetchFunction = GTH.FetchFunction;
export import GoToHumanConstructorParams = GTH.GoToHumanConstructorParams;
export import TaskStartedParams = GTH.TaskStartedParams;
export import TaskCompletedParams = GTH.TaskCompletedParams;
export import RequestHumanApprovalBaseParams = GTH.RequestHumanApprovalBaseParams;
export import RequestHumanApprovalParams = GTH.RequestHumanApprovalParams;
export import ServeToHumanParams = GTH.ServeToHumanParams;
export import HumanResponse = GTH.HumanResponse;
export import ActionValue = GTH.ActionValue;
export import ActionValueResponse = GTH.ActionValueResponse;
export import HumanWebhookResponse = GTH.HumanWebhookResponse;
export import HumanResponseCallback = GTH.HumanResponseCallback;
export import GoToHuman = GTH.GoToHuman;

export interface AiFlowConstructorParams {
  onTrigger?: string;
  agentId: string;
  fetch: FetchFunction;
}

export interface StepFunctionParams {
  flow: AiFlow,
  input?: any,
  config?: Record<string, string>,
  infos?: {
    approved?: boolean
  }
}

export type StepFunction = (params: StepFunctionParams) => Promise<any | void>

export interface StepParams {
  id: string;
  name?: string;
  fn: StepFunction;
}

export interface GotoHumanParams {
  id: string;
  name?: string;
  options?: {
    onlyServeResults?: boolean;
    multiSelectFanOut?: boolean;
    allowEditing?: boolean;
  };
}

export interface TriggerWebhookParams {
  apiKey?: string;
  agentId?: string;
  triggerEvent?: string;
  runId?: string;
  parentRunId?: string;
  actionValues?: ActionValue[];
  config?: Record<string, string>;
  taskId?: string;
  humanResponse?: HumanResponse;
}

export interface SkipResult {
  skipTo: string;
  result?: any;
}

interface Step {
  id: string;
  name?: string;
  stepFn: StepFunction;
  interrupt?: boolean;
}

export interface AiFlowResponse {
  success: boolean;
}

export interface AiFlowSuccess extends AiFlowResponse {
  lastResult?: any;
}

export interface AiFlowFailed extends AiFlowResponse {
  errorName: string;
  errorMsg: string;
}

export interface AiFlowRejected extends AiFlowResponse {
  reason: string;
}

export class AiFlow {
  private steps: Step[];
  private onTrigger?: string;
  private agentId: string;
  private fetch: FetchFunction;
  private gth!: GoToHuman;

  static skipTo(stepId: string, result?: any): SkipResult {
    return { skipTo: stepId, result: result };
  }

  constructor({ onTrigger, agentId, fetch }: AiFlowConstructorParams) {
    this.steps = [];
    this.onTrigger = onTrigger;
    this.agentId = agentId;
    this.fetch = fetch;
  }

  isSkipResult(obj: any): obj is SkipResult {
    return ( 
      typeof obj === "object" && 
      obj !== null && 
      "skipTo" in obj
    ); 
  }

  step({ id, name, fn }: StepParams) {
    if (id == undefined || fn == undefined)
      throw new Error('id and fn are required');
    if (this.steps.findIndex((val) => val.id == id) >= 0)
      throw new Error('task id needs to be unique');
    const stepFn: StepFunction = async (args: StepFunctionParams) => {
      await this.gth.startedTask({ id: id, name: name });
      const result = await fn(args);
      const resultToSend = (result == null) ? undefined : (Array.isArray(result) ? this.santitizeStrArray(result) : this.santitizeStrValue(this.isSkipResult(result) ? result.result : result));
      await this.gth.completedTask({ id: id, name: name, result: resultToSend });
      return result;
    }
    this.steps.push({ id, name, stepFn });
  }

  gotoHuman({ id, name, options }: GotoHumanParams) {
    const stepFn: StepFunction = async (args: StepFunctionParams) => {
      const actionValuesToSend = (args.input == null) ? undefined : this.santitizeArray(Array.isArray(args.input) ? args.input : [args.input]);
      if (!!options && options.onlyServeResults) {
        await this.gth.serveToHuman({ taskId: id, taskName: name, actionValues: actionValuesToSend });
      } else if (!!options && options.multiSelectFanOut) {
        await this.gth.requestHumanMultiSelectFanOut({ taskId: id, taskName: name, actionValues: actionValuesToSend });
      } else {
        await this.gth.requestHumanApproval({ taskId: id, taskName: name, actionValues: actionValuesToSend, ...(!!options && (options.allowEditing != null) && { allowEditing: options.allowEditing }) });
      }
      return null;
    }
    this.steps.push({ id, name, stepFn, interrupt: true });
  }

  private santitizeStrValue(obj: any): string {
    return (typeof obj === 'string') ? obj : JSON.stringify(obj);
  }

  private santitizeStrArray(arr: any[]): string[] {
    return arr.map(val => this.santitizeStrValue(val));
  }

  private santitizeValue(obj: any): string | ActionValue {
    return (this.isActionValue(obj) || typeof obj === 'string') ? obj : JSON.stringify(obj);
  }

  private santitizeArray(arr: any[]): (string | ActionValue)[] {
    return arr.map(val => this.santitizeValue(val));
  }

  private isActionValue = (value: any): value is ActionValue => {
    return value.id != null && value.type != null;
  };

  async executeSteps({ apiKey, agentId, triggerEvent, runId, parentRunId, actionValues, config, taskId, humanResponse }: TriggerWebhookParams, apiKeyBackup?: string): Promise<AiFlowSuccess|AiFlowFailed|AiFlowRejected> {
    if (!!agentId && (agentId !== this.agentId)) return {success: false, reason: `I'm not agent ${agentId}`}; //agentId explicitly targeted, but its not this agent
    if (!!triggerEvent && (triggerEvent !== this.onTrigger)) return {success: false, reason: `I don't react to ${triggerEvent}`}; // there is a triggerEvent but its not for this agent
    try {
      this.gth = new GoToHuman({ apiKey: apiKey || apiKeyBackup, agentId: this.agentId, agentRunId: runId, parentRunId: parentRunId, fetch: this.fetch });
      const comingFromUserDecision = !!humanResponse;
      if (!comingFromUserDecision && this.onTrigger != undefined) {
        await this.gth.completedTask({ id: this.onTrigger, result: actionValues?.map(val => val.text || 'NO_TEXT') });
      } else if (!comingFromUserDecision && agentId != undefined && actionValues) {
        await this.gth.completedTask({ id: "triggered", result: actionValues?.map(val => val.text || 'NO_TEXT') });
      }
      let stepInput: any = actionValues;
      const firstStepToRun = comingFromUserDecision ? (this.steps.findIndex(val => val.id === taskId) + 1) : 0;
      const stepsQueued = this.steps.slice(firstStepToRun);
      for (const [index, step] of stepsQueued.entries()) {
        if (humanResponse == HumanResponse.Rejected) {
          await this.gth.archive();
          break;
        }
        if (stepInput != null && this.isSkipResult(stepInput)) {
          if (step.id !== stepInput.skipTo) continue;
          stepInput = stepInput.result;
        }
        console.log(`run step ${index} ${step.id} ${JSON.stringify(stepInput)}`);
        stepInput = await step.stepFn({ flow: this, input: stepInput, config: config, infos: { approved: (humanResponse == 'human_approved') } });
        if (step.interrupt) break;
        if (index == (stepsQueued.length - 1))
          await this.gth.archive();
      }
      return { success: true, lastResult: stepInput };
    } catch (err) {
      console.error("Throwing error", err);
      return { success: false, errorName: (err instanceof Error ? err.name : ""), errorMsg: (err instanceof Error ? err.message : "") };
    }
  }
}