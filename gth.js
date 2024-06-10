const { v4: uuidv4 } = require('uuid');

class GoToHuman {
    constructor({apiKey, agentId, agentRunId = uuidv4(), fetch}) {
        this.apiKey = apiKey;
        this.agentId = agentId;
        this.agentRunId = agentRunId;
        this.fetch = fetch;
    }

    async callGoToHuman({state, params, stepResult = null, actionValues = null, allowEditing = false}) {
        const url = "https://api.gotohuman.com/postRunState";
        const data = {
            apiKey: this.apiKey,
            agentId: this.agentId,
            agentRunId: this.agentRunId,
            state: state,
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

    async requestHumanApproval({taskId = null, taskName = null, taskDesc = null, actionValues = null, allowEditing = true, completedTasks = null}) {
        console.log(`requestHumanApproval ${taskId} ${taskName} ${taskDesc} ${actionValues} ${allowEditing} ${completedTasks}`);
        await this.callGoToHuman({state: "requested_human_approval", params:{
            ...(taskId && { taskId: taskId }),
            ...(taskName && { taskName: taskName }),
            ...(taskDesc && { taskDesc: taskDesc }),
            ...(completedTasks && { completedTasks: completedTasks })
        },...(actionValues !== null && { actionValues: actionValues }), allowEditing: allowEditing});
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
}

module.exports = GoToHuman;