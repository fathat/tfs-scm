import { TFSWorkspace } from "./tfsSourceControl";
import * as vscode from 'vscode';
import * as cpp from "child-process-promise";
import { TFSDocumentContentProvider } from "./tfsDocumentContentProvider";
import { TFSLocalDatabase, StateChange } from "./tfsLocalDatabase";
import { scryptSync } from "crypto";

export class TFSSourceControlManager {

    tfs: TFSWorkspace;

    public out: vscode.OutputChannel;
    public documentContentProvider: TFSDocumentContentProvider;
    public database: TFSLocalDatabase;

    constructor(private context: vscode.ExtensionContext) {

        this.database = new TFSLocalDatabase(context);
        this.documentContentProvider = new TFSDocumentContentProvider();
        this.tfs = new TFSWorkspace(context, this.database);

        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', this.documentContentProvider));

        this.out = vscode.window.createOutputChannel('TFS');
    }

    excludeFileFromChangeset(path: string): void {
        const wasModified = this.database.excludeFileFromChangeset(path);
        if(wasModified === StateChange.Modified) {
            this.tfs.update();
        }
    }    
    
    includeFileInChangeset(path: string): void {
        const wasModified = this.database.includeFileInChangeset(path);
        if(wasModified === StateChange.Modified) {
            this.tfs.update();
        }
    }

    includeAll(): void {
        this.tfs.includeAll();
    }

    excludeAll(): void {
        this.database.excludeAll();
        this.tfs.excludeAll();
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
        this.tfs.update();
    }
}