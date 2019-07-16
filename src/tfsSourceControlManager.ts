import { TFSWorkspaceMapping } from "./tfsSourceControl";
import * as vscode from 'vscode';
import * as cpp from "child-process-promise";
import { TFSDocumentContentProvider } from "./tfsDocumentContentProvider";
import { TFSLocalDatabase, StateChange } from "./tfsLocalDatabase";
import { IWorkspace } from "./tfsWorkspaceInfo";
import { TFSStatusItem } from "./tfsRepository";

export class TFSSourceControlManager {

    workspace: TFSWorkspaceMapping[] = [];

    public out: vscode.OutputChannel;
    public documentContentProvider: TFSDocumentContentProvider;
    public database: TFSLocalDatabase;

    constructor(private context: vscode.ExtensionContext, workspaces: IWorkspace[]) {

        this.database = new TFSLocalDatabase(context);
        this.documentContentProvider = new TFSDocumentContentProvider();

        for(const wks of workspaces) {
            for(const mapping of wks.mappings) {
                this.workspace.push(new TFSWorkspaceMapping(context, wks, mapping, this.database));
            }
        }        
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', this.documentContentProvider));

        this.out = vscode.window.createOutputChannel('TFS');
    }

    excludeOne(path: string): void {
        const wasModified = this.database.excludeFileFromChangeset(path);
        if(wasModified === StateChange.Modified) {
            for(const wks of this.workspace) {
                wks.update();
            }
        }
    }    
    
    includeOne(path: string): void {
        const wasModified = this.database.includeFileInChangeset(path);
        if(wasModified === StateChange.Modified) {
            for(const wks of this.workspace) {
                wks.update();
            }
        }
    }

    includeList(items: TFSStatusItem[]): void {
        this.database.includeList(items.map(item => item.resourceUri.fsPath));
        for(const wks of this.workspace) {
            wks.update();
        }
    }

    excludeList(items: TFSStatusItem[]): void {
        this.database.excludeList(items.map(item => item.resourceUri.fsPath));
        for(const wks of this.workspace) {
            wks.update();
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
        for(const wks of this.workspace) {
            wks.update();
        }
    }
}