import { TFSWorkspaceMapping } from "./tfsWorkspaceMapping";
import * as vscode from 'vscode';
import * as cpp from "child-process-promise";
import { TFSDocumentContentProvider } from "./tfsDocumentContentProvider";
import { TFSPendingChangesDatabase, StateChange } from "./tfsLocalDatabase";
import { ITFSWorkspaceInfo, inTFS } from "./tfsWorkspaceInfo";
import { TFSStatusItem } from "./TFSStatusItem";

export class TFSSourceControlManager {

    workspace: TFSWorkspaceMapping[] = [];

    public out: vscode.OutputChannel;
    public documentContentProvider: TFSDocumentContentProvider;
    public database: TFSPendingChangesDatabase;

    constructor(private context: vscode.ExtensionContext, workspaces: ITFSWorkspaceInfo[]) {

        this.database = new TFSPendingChangesDatabase(context);
        this.documentContentProvider = new TFSDocumentContentProvider();

        
        for(const wks of workspaces) {
            for(const mapping of wks.mappings) {
                const mappingInWorkspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(mapping.localPath));
                let workspaceIsSubfolderOfTFSMapping = false;

                if(vscode.workspace.workspaceFolders) {
                    for(const vscodeWorkspace of vscode.workspace.workspaceFolders) {
                        const wkspacePath = `${vscodeWorkspace.uri.fsPath.toLowerCase().replace(/\\/g, '/')}/`;
                        const mappingPath = `${mapping.localPath.toLowerCase().replace(/\\/g, '/')}/`;
                        if(wkspacePath.startsWith(mappingPath)) {
                            workspaceIsSubfolderOfTFSMapping = true;
                        }
                    }
                }

                if(workspaceIsSubfolderOfTFSMapping || mappingInWorkspace) {
                    this.workspace.push(new TFSWorkspaceMapping(context, wks, mapping, this.database));
                }
            }
        }        
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', this.documentContentProvider));

        this.out = vscode.window.createOutputChannel('TFS');
    }

    excludeOne(fsPath: string): void {
        const wasModified = this.database.excludeFileFromChangeset(fsPath);
        if(wasModified === StateChange.Modified) {
            for(const wks of this.workspace) {
                wks.update();
            }
        }
    }    
    
    includeOne(fsPath: string): void {
        const wasModified = this.database.includeFileInChangeset(fsPath);
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