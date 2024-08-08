class GoToHuman {
    constructor({apiKey, agentId, agentRunId = null, parentRunId = null, fetch}) {
        this.apiKey = apiKey;
        this.agentId = agentId;
        this.agentRunId = agentRunId;
        this.parentRunId = parentRunId;
        this.fetch = fetch;
    }

    async callGoToHuman({state, subState, params, stepResult = null, actionValues = null, allowEditing = false}) {
        const url = "https://api.gotohuman.com/postRunState";
        const data = {
            apiKey: this.apiKey,
            agentId: this.agentId,
            ...(this.agentRunId && { agentRunId: this.agentRunId }),
            ...(this.parentRunId && { parentRunId: this.parentRunId }),
            state: state,
            ...(subState && { subState: subState }),
            ...params,
            ...(stepResult && { result: stepResult }),
            ...(actionValues && { actionValues: actionValues, allowEditing: allowEditing }),
            millis: Date.now()
        };

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

    async startedTask({id, name = null, desc = null}) {
        console.log(`startedTask ${id}`);
        this.lastTaskId = id;
        await this.callGoToHuman({state: "task_running", params: {
            taskId: id,
            ...(name && { taskName: name }),
            ...(desc && { taskDesc: desc })
        }});
    }

    async completedTask({id = null, name = null, desc = null, result = null}) {
        const idToSend = id || this.lastTaskId;
        console.log(`completedTask ${idToSend} ${result}`);
        await this.callGoToHuman({state: "task_done", params: {
            taskId: idToSend,
            ...(name && { taskName: name }),
            ...(desc && { taskDesc: desc }),
        }, ...(!!result && { stepResult: result })});
    }

    async requestHumanApproval({taskId = null, taskName = null, taskDesc = null, actionValues = null, allowEditing = true, completedTasks = null, subState = null}) {
        console.log(`requestHumanApproval ${taskId} ${taskName} ${taskDesc} ${actionValues} ${allowEditing} ${completedTasks}`);
        await this.callGoToHuman({state: "requested_human_approval",
          ...(subState && { subState: subState }),
          params:{
            ...(taskId && { taskId: taskId }),
            ...(taskName && { taskName: taskName }),
            ...(taskDesc && { taskDesc: taskDesc }),
            ...(completedTasks && { completedTasks: completedTasks })
          },...(actionValues !== null && { actionValues: actionValues }), allowEditing: allowEditing});
    }

    async requestHumanMultiSelectFanOut({taskId = null, taskName = null, taskDesc = null, actionValues = null, completedTasks = null}) {
        console.log(`requestHumanMultiSelectFanOut ${taskId} ${taskName} ${taskDesc} ${actionValues} ${completedTasks}`);
        await this.requestHumanApproval({taskId: taskId, taskName: taskName, taskDesc: taskDesc, actionValues: actionValues, allowEditing: false, completedTasks: completedTasks, subState: "multi_select_fan_out"});
    }

    async serveToHuman({taskId = null, taskName = null, taskDesc = null, actionValues = null, completedTasks = null}) {
        console.log(`serveToHuman ${taskId}  ${taskName} ${taskDesc} ${actionValues} ${completedTasks}`);
        await this.callGoToHuman({state: "served_to_human", params: {
            ...(taskId && { taskId: taskId }),
            ...(taskName !== null ? { taskName: taskName } : {}),
            ...(taskDesc !== null ? { taskDesc: taskDesc } : {}),
            ...(completedTasks !== null ? { completedTasks: completedTasks } : {})
        },...(actionValues !== null ? { actionValues: actionValues } : {})});
    }

    async archive() {
      await this.callGoToHuman({state: "archived"})
    }

    static handleHumanResponse(responseBody, callback) {
      if (!callback || !responseBody) return;
      console.log("respBody ", responseBody);
      const {apiKey, agentId, triggerEvent, runId, parentRunId, actionValues, config, taskId, humanResponse} = responseBody || {};
      if (callback.onHumanResponse) {
        callback.onHumanResponse(humanResponse == 'human_approved', responseBody);
      }
      if (humanResponse == 'human_approved' && callback.onHumanApproved) {
        callback.onHumanApproved(responseBody);
      } else if (humanResponse == 'human_rejected' && callback.onHumanRejected) {
        callback.onHumanRejected(responseBody);
      }
    }
}

export default GoToHuman;