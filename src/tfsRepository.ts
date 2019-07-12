import { QuickDiffProvider, WorkspaceFolder, CancellationToken, ProviderResult, Uri, workspace } from "vscode";
import * as path from 'path';
import { tfcmd } from "./tfsCmd";

export const TFS_SCHEME = 'tfs';

const reServerPathWithChangeset = /^\$(.*)/;
const reServerPath = /^\$(.*);(\S+)?/;
const reLocalFilePath = /^  Local item : \[.*\] (.*)/;
const reChangeType =    /^  Change(\s+): (.*)/;
const reWorkspace =    /^  Workspace(\s+): (.*)/;

export class TFSStatusItem {
	
	constructor(
		public serverpath: string,
		public localpath: string,
		public changetype: string,
		public workspace: string,
		public changeset: string) {}
}

export class TFSRepository implements QuickDiffProvider {

	constructor(private workspaceFolder: WorkspaceFolder, private slug: string) { }

	provideOriginalResource?(uri: Uri, token: CancellationToken): ProviderResult<Uri> {
		let path = uri.fsPath;
		return Uri.parse(`${TFS_SCHEME}:${path}`);
	}

	public async provideStatus() {
		const result = await tfcmd(["stat", "/format:detailed"]);
		const lines = result.stdout.split('\r\n');

		let statusItems: TFSStatusItem[] = [];
		
		let currentStatusItem: any = null;

		for(const line of lines) {
			
			if (line.startsWith("$")) {
				
				let serverpath;
				let changeset = null;
				[serverpath, changeset] = line.split(';');

				if (serverpath) {
					if(currentStatusItem !== null && currentStatusItem.inworkspace) {
						statusItems.push(new TFSStatusItem(
							currentStatusItem.serverpath,
							currentStatusItem.localpath,
							currentStatusItem.changetype,
							currentStatusItem.workspace,
							currentStatusItem.changeset
						));
					} 

					currentStatusItem = { serverpath, changeset, inworkspace:false };
				}
			} 

			if (line.startsWith('  Local item :')) {
				let [, path] = reLocalFilePath.exec(line) || [null, null]; 			
				
				if(path) {
					let uri = Uri.file(path);
					let relative = workspace.asRelativePath(uri);
					currentStatusItem.localpath = relative;

					if(relative.match(/^\w\:/)) {
						currentStatusItem.inworkspace = false;
					} else {
						currentStatusItem.inworkspace = true;
					}
					
				}
			}

			
			if (line.startsWith('  Change')) {
				let [, changetype] = reChangeType.exec(line) || [null, null]; 			
				
				if(changetype) {
					currentStatusItem.changetype = changetype;
				}
			}

			if (line.startsWith('  Workspace')) {
				let [, workspace] = reWorkspace.exec(line) || [null, null]; 			
				
				if(workspace) {
					currentStatusItem.changetype = workspace;
				}
			}
		}

		if(currentStatusItem !== null && currentStatusItem.inworkspace) {
			statusItems.push(new TFSStatusItem(
				currentStatusItem.serverpath,
				currentStatusItem.localpath,
				currentStatusItem.changetype,
				currentStatusItem.workspace,
				currentStatusItem.changeset
			));
		}

		return statusItems;
	}
}