import { TFSWorkspace } from "./tfsWorkspace";
import * as vscode from 'vscode';
import * as cpp from "child-process-promise";
import { TFSDocumentContentProvider } from "./tfsDocumentContentProvider";
import { TFSLocalDatabase, StateChange } from "./tfsLocalDatabase";
import { inTFS } from "./tfsWorkspaceInfo";

export class TFSSourceControlManager {

    scmMap: Map<vscode.Uri, TFSWorkspace> = new Map<vscode.Uri, TFSWorkspace>();

    public out: vscode.OutputChannel;
    public documentContentProvider: TFSDocumentContentProvider;
    public database: TFSLocalDatabase;

    constructor(private context: vscode.ExtensionContext) {

        this.database = new TFSLocalDatabase(context);
        this.documentContentProvider = new TFSDocumentContentProvider();

        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', this.documentContentProvider));

        this.out = vscode.window.createOutputChannel('TFS');

        if (!vscode.workspace.workspaceFolders) {
            throw new Error("Workspace folders are undefined! Extension should not have started.");
        }

        for (let folder of vscode.workspace.workspaceFolders) {
            this.out.appendLine(`Scanning ${folder.uri.fsPath}`);
            
            inTFS(folder).then((isInFolder) => {
                if (isInFolder) {
                    this.out.appendLine(`Registering as SCM for ${folder.uri.fsPath}`);
                    this.scmMap.set(folder.uri, new TFSWorkspace(context, folder, this.database));
                } else {
                    this.out.appendLine(`Workspace folder ${folder.uri.fsPath} does not match a TFS mapping, skipping`);
                }
            });
        }

    }

    excludeFileFromChangeset(path: string): void {
        const wasModified = this.database.excludeFileFromChangeset(path);
        if(wasModified === StateChange.Modified) {
            for (const [_, sc] of this.scmMap) {
                sc.update();
            }
        }
    }    
    
    includeFileInChangeset(path: string): void {
        const wasModified = this.database.includeFileInChangeset(path);
        if(wasModified === StateChange.Modified) {
            for (const [_, sc] of this.scmMap) {
                sc.update();
            }
        }
    }

    async cmd(args: string[], cwd?: string) {
        const tfPath = vscode.workspace.getConfiguration("tfsSCM", null).get<string>("tfsPath");

        if (typeof tfPath !== 'undefined') {
            try {
                let result: cpp.SpawnPromiseResult;
                if (cwd) {
                    result = await cpp.spawn(tfPath, args, { capture: ["stdout", "stderr"], cwd });
                } else {
                    result = await cpp.spawn(tfPath, args, { capture: ["stdout", "stderr"] });
                }
                this.out.append(result.stdout);
                this.out.append(result.stderr);
                return result;
            }
            catch (err) {
                throw err.stderr ? new Error(err.stderr) : err;
            }
        }
        throw new Error("TFS path not configured!");
    }

    refresh() {
        for (const [_, sc] of this.scmMap) {
            sc.update();
        }
    }
}