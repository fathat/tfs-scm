import { TFSSourceControl } from "./tfsSourceControl";
import * as vscode from 'vscode';
import * as cpp from "child-process-promise";
import { TFSDocumentContentProvider } from "./tfsDocumentContentProvider";

export class TFSSourceControlManager {

    scmMap : Map<vscode.Uri, TFSSourceControl> = new Map<vscode.Uri, TFSSourceControl>();
    
    public out : vscode.OutputChannel;
    public documentContentProvider: TFSDocumentContentProvider;
    
    constructor (private context: vscode.ExtensionContext) {

        this.documentContentProvider = new TFSDocumentContentProvider();
    
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', this.documentContentProvider));
        
        this.out = vscode.window.createOutputChannel('TFS');

        if(!vscode.workspace.workspaceFolders) {
            throw new Error("Workspace folders are undefined! Extension should not have started.");
        }

        for(let folder of vscode.workspace.workspaceFolders) {
            this.out.appendLine(`Scanning ${folder.uri}`);

            vscode.workspace.openTextDocument(folder.uri.path + '/tfsconf.json').then((confDoc : vscode.TextDocument) => {
                this.out.appendLine(`Registering as SCM for ${folder.uri}`);
                this.scmMap.set(folder.uri, new TFSSourceControl(context, folder));
            }, 
            (reason) => this.out.appendLine(`Workspace folder ${folder.uri} does not contain a tfsconf.json, skipping`));
        }
        
    }

    async cmd(args: string[], cwd?: string) {
        const tfPath = vscode.workspace.getConfiguration("tfsSCM", null).get<string>("tfsPath");
        
        if(typeof tfPath !== 'undefined') {
            try {
                let result: cpp.SpawnPromiseResult;
                if(cwd) {
                    result = await cpp.spawn(tfPath, args, { capture: ["stdout", "stderr"], cwd });
                } else {
                    result = await cpp.spawn(tfPath, args, { capture: ["stdout", "stderr"] });
                }
                this.out.append(result.stdout);
                this.out.append(result.stderr);
                return result;
            }
            catch(err) {
                throw err.stderr ? new Error(err.stderr) : err;
            }
        }
        throw new Error("TFS path not configured!");
    }

    refresh() {
        for(const [_, sc] of this.scmMap) {
            sc.update();
        }
    }
}