export type FetchFunction = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface GoToHumanConstructorParams {
    apiKey: string | undefined;
    agentId: string | undefined;
    agentRunId?: string;
    parentRunId?: string;
    fetch: FetchFunction;
}

export interface TaskStartedParams {
    id: string;
    name?: string;
    desc?: string;
}

export interface TaskCompletedParams {
  taskId?: string;
  taskName?: string;
  taskDesc?: string;
  result?: string | string[] | unknown;
  type?: string;
}

export interface RequestHumanApprovalBaseParams {
    taskId?: string;
    taskName?: string;
    taskDesc?: string;
    actionValues?: (ActionValue | string)[];
    completedTasks?: TaskCompletedParams[];
}

export interface RequestHumanApprovalParams extends RequestHumanApprovalBaseParams {
    allowEditing?: boolean;
    subState?: string;
}

export interface ServeToHumanParams {
    taskId?: string;
    taskName?: string;
    taskDesc?: string;
    actionValues?: (ActionValue | string)[];
    completedTasks?: TaskCompletedParams[];
}

interface CallParams {
    state: string;
}

interface TaskStartedCallParams extends CallParams {
    taskId: string;
    taskName?: string;
    taskDesc?: string;
}

interface TaskCompletedCallParams extends CallParams {
    taskId?: string;
    taskName?: string;
    taskDesc?: string;
    result?: string | string[] | unknown;
    type?: string;
}

interface RequestHumanApprovalCallParams extends CallParams {
    taskId?: string;
    taskName?: string;
    taskDesc?: string;
    actionValues?: (ActionValue | string)[];
    allowEditing: boolean;
    completedTasks?: TaskCompletedParams[];
    subState?: string;
}

interface ServeToHumanCallParams extends CallParams {
    taskId?: string;
    taskName?: string;
    taskDesc?: string;
    actionValues?: (ActionValue | string)[];
    completedTasks?: TaskCompletedParams[];
}

export enum HumanResponse {
  Approved = "human_approved",
  Rejected = "human_rejected",
  Unknown = "unknown"
}

export interface ActionValue {
  id: string;
  type: string;
  text?: string;
  label?: string;
}

export interface ActionValueResponse extends ActionValue {
  wasEdited: boolean;
}

export interface HumanWebhookResponse {
  taskId?: string;
  taskName?: string;
  agentId: string;
  runId: string;
  gthLinkToRun: string;
  humanResponse: HumanResponse;
  respondingUserId: string;
  respondingUserEmail: string;
  actionValues: ActionValueResponse[];
}

export interface HumanResponseCallback {
    onHumanResponse?: (approved: boolean, webhookResponse: HumanWebhookResponse) => void;
    onHumanApproved?: (webhookResponse: HumanWebhookResponse) => void;
    onHumanRejected?: (webhookResponse: HumanWebhookResponse) => void;
}

export class GoToHuman {
  private apiKey: string;
  private agentId: string;
  private agentRunId?: string;
  private parentRunId?: string;
  private fetch: FetchFunction;
  private lastTaskId?: string;

  constructor({ apiKey, agentId, agentRunId, parentRunId, fetch }: GoToHumanConstructorParams) {
      if (typeof apiKey === "undefined") throw new Error("Please provide your gotoHuman api key")
      if (typeof agentId === "undefined") throw new Error("Please provide an agentId")
      this.apiKey = apiKey;
      this.agentId = agentId;
      this.agentRunId = agentRunId;
      this.parentRunId = parentRunId;
      this.fetch = fetch;
  }

  private async callGoToHuman(params: CallParams): Promise<any> {
      const url = "https://api.gotohuman.com/postRunState";

      const data = {
        apiKey: this.apiKey,
        agentId: this.agentId,
        agentRunId: this.agentRunId,
        parentRunId: this.parentRunId,
        ...params,
        millis: Date.now()
      }

      const response = await this.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });

      if (response.ok) {
          const responseData = await response.json();
          console.log("Request successful! Response:", responseData);
          this.agentRunId = responseData.agentRunId; // in case a new run id was generated server-side, we can set it here to be used in consecutive calls for this run
          return responseData;
      } else {
          const responseText = await response.text();
          console.error(`Failed to make request. Status Code: ${response.status} Response: ${responseText}`);
          throw new Error(`Failed to send to gotoHuman: ${responseText}`);
      }
  }

  async startedTask({ id, name, desc }: TaskStartedParams): Promise<void> {
      console.log(`startedTask ${id}`);
      this.lastTaskId = id;
      const callParams: TaskStartedCallParams = {
        state: "task_running",
        taskId: id,
        taskName: name,
        taskDesc: desc
      }
      await this.callGoToHuman(callParams);
  }

  async completedTask({ taskId, taskName, taskDesc, type, result }: TaskCompletedParams = {}): Promise<void> {
      const idToSend = taskId || this.lastTaskId;
      console.log(`completedTask ${idToSend}`, result);
      const callParams: TaskCompletedCallParams = {
        state: "task_done",
        taskId: idToSend,
        taskName: taskName,
        taskDesc: taskDesc,
        type: type,
        result: result
      }
      await this.callGoToHuman(callParams);
  }

  async requestHumanApproval({ taskId, taskName, taskDesc, actionValues, allowEditing = true, completedTasks, subState }: RequestHumanApprovalParams): Promise<void> {
      console.log(`requestHumanApproval ${taskId} ${taskName} ${taskDesc} ${actionValues} ${allowEditing} ${completedTasks}`);
      const callParams: RequestHumanApprovalCallParams = {
        state: "requested_human_approval",
        subState: subState,
        taskId: taskId,
        taskName: taskName,
        taskDesc: taskDesc,
        completedTasks: completedTasks,
        actionValues: actionValues,
        allowEditing: allowEditing
      }
      await this.callGoToHuman(callParams);
  }

  async requestHumanMultiSelectFanOut(humanApprovalBaseParams: RequestHumanApprovalBaseParams): Promise<void> {
      console.log(`requestHumanMultiSelectFanOut`, humanApprovalBaseParams);
      const callParams: RequestHumanApprovalParams = {
        ...humanApprovalBaseParams,
        allowEditing: false,
        subState: "multi_select_fan_out"
      }
      await this.requestHumanApproval(callParams);
  }

  async serveToHuman({ taskId, taskName, taskDesc, actionValues, completedTasks }: ServeToHumanParams): Promise<void> {
      console.log(`serveToHuman ${taskId} ${taskName} ${taskDesc} ${actionValues} ${completedTasks}`);
      const callParams: ServeToHumanCallParams = {
        state: "served_to_human",
        taskId: taskId,
        taskName: taskName,
        taskDesc: taskDesc,
        completedTasks: completedTasks,
        actionValues: actionValues
      }
      await this.callGoToHuman(callParams);
  }

  async archive(): Promise<void> {
      const callParams : CallParams = {state: "archived"};
      await this.callGoToHuman(callParams);
  }

  static handleHumanResponse(responseBody: any, callback: HumanResponseCallback): void {
      if (!callback || !responseBody) return;
      console.log("respBody ", responseBody);
      const parsedBody = this.parseApiResponse(responseBody);
      const { humanResponse } = parsedBody;
      if (callback.onHumanResponse) {
          callback.onHumanResponse(humanResponse === HumanResponse.Approved, parsedBody);
      }
      if (humanResponse === HumanResponse.Approved && callback.onHumanApproved) {
          callback.onHumanApproved(parsedBody);
      } else if (humanResponse === HumanResponse.Rejected && callback.onHumanRejected) {
          callback.onHumanRejected(parsedBody);
      }
  }

  private static isKnownResponseType = (value: any): value is HumanResponse => {
    return value === HumanResponse.Approved || value === HumanResponse.Rejected;
  };

  static parseApiResponse = (responseBody: any): HumanWebhookResponse => {
    const humanResponse: HumanResponse = this.isKnownResponseType(responseBody.humanResponse) ? responseBody.humanResponse : HumanResponse.Unknown;
    const taskId = typeof responseBody.taskId === 'string' ? responseBody.taskId : undefined;
    const taskName = typeof responseBody.taskName === 'string' ? responseBody.taskName : undefined;
    const agentId = typeof responseBody.agentId === 'string' ? responseBody.agentId : '';
    const runId = typeof responseBody.runId === 'string' ? responseBody.runId : '';
    const gthLinkToRun = typeof responseBody.gthLinkToRun === 'string' ? responseBody.gthLinkToRun : '';
    const respondingUserId = typeof responseBody.respondingUserId === 'string' ? responseBody.respondingUserId : '';
    const respondingUserEmail = typeof responseBody.respondingUserEmail === 'string' ? responseBody.respondingUserEmail : '';
    const actionValues = Array.isArray(responseBody.actionValues) ? responseBody.actionValues.map(this.parseActionValue) : [];
  
    return { taskId, taskName, agentId, runId, gthLinkToRun, humanResponse, respondingUserId, respondingUserEmail, actionValues };
  };

  static parseActionValue = (value: any): ActionValueResponse => {
    const id = typeof value.id === 'string' ? value.id : '';
    const type = typeof value.type === 'string' ? value.type : '';
    const text = typeof value.text === 'string' ? value.text : '';
    const wasEdited = typeof value.wasEdited === 'boolean' ? value.wasEdited : false;
    return { id, type, text, wasEdited };
  };

  static getActionValueById(id: string, response: HumanWebhookResponse) {
    return response.actionValues.find(actionValue => actionValue.id === id);
  }
}