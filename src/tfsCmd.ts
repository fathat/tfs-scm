import * as vscode from 'vscode';
import * as cpp from "child-process-promise";

export async function tfcmd(args: string[]) {
    const tfPath = vscode.workspace.getConfiguration("tfsSCM", null).get<string>("tfsPath");
    if(typeof tfPath !== 'undefined') {
        try {
            return await cpp.spawn(tfPath, args, { capture: ["stdout", "stderr"] })
        }
        catch(err) {
            throw err.stderr ? new Error(err.stderr) : err;
        }
    }
    throw new Error("TFS path not configured!");
}