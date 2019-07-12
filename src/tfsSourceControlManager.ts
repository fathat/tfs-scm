import { TFSSourceControl } from "./tfsSourceControl";
import * as vscode from 'vscode';

export class TFSSourceControlManager {

    scmMap : Map<vscode.Uri, TFSSourceControl> = new Map<vscode.Uri, TFSSourceControl>();
    
    constructor (private context: vscode.ExtensionContext) {
        if(vscode.workspace.workspaceFolders) {
            for(let folder of vscode.workspace.workspaceFolders) {
                console.log(folder.uri);

                vscode.workspace.openTextDocument(folder.uri.path + '/tfsconf.json').then((confDoc : vscode.TextDocument) => {
                    this.scmMap.set(folder.uri, new TFSSourceControl(context, folder));
                }, 
                (reason) => console.log(`Workspace folder ${folder.uri} does not contain a tfsconf.json`));
            }
        }
    }

    refresh() {
        for(const [_, sc] of this.scmMap) {
            sc.update();
        }
    }
}