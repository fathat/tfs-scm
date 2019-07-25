import { Uri, workspace, TreeItem } from "vscode";
import { tfcmd } from "./tfsCmd";
import { TFSStatusItem } from "./TFSStatusItem";

export const TFS_SCHEME = 'tfs';

const reServerPathWithChangeset = /^\$(.*)/;
const reServerPath = /^\$(.*);(\S+)?/;
const reLocalFilePath = /^\s*Local item\s*:\s*\[.*\]\s*(.*)/;
const reChangeType = /^\s*Change\s*:\s*(.*)/;
const reWorkspace = /^\s*Workspace\s*:\s*(.*)/;

export class TFSRepositoryView {

	constructor(private localRoot: string) { }
	
	public async provideStatus() {
		const result = await tfcmd(["stat", "/format:detailed"], this.localRoot);
		const lines = result.stdout.split('\r\n').map(l => l.trim());

		let statusItems: TFSStatusItem[] = [];

		let currentStatusItem: any = null;

		for (const line of lines) {

			if (line.startsWith("$")) {

				let serverpath;
				let changeset = null;
				[serverpath, changeset] = line.split(';');

				if (serverpath) {
					if (currentStatusItem !== null && currentStatusItem.inworkspace) {
						statusItems.push(new TFSStatusItem(
							currentStatusItem.resourceUri,
							currentStatusItem.serverpath,
							currentStatusItem.changetype,
							currentStatusItem.workspace,
							currentStatusItem.changeset,
							currentStatusItem.source
						));
					}
					currentStatusItem = { serverpath, changeset, inworkspace: false };
				}
			}

			if (line.startsWith('Source item')) {
				const [label, sourcePath] = line.split(':').map(x => x.trim());
				currentStatusItem.source = sourcePath;
			}

			if (line.startsWith('Local item')) {
				let [, path] = reLocalFilePath.exec(line) || [null, null];

				if (path) {
					let uri = Uri.file(path);
					let relative = workspace.asRelativePath(uri).replace('\\', '/');
					currentStatusItem.resourceUri = uri;

					// if the path is like "C:\something" we know it's not in the workspace
					if (relative.match(/^\w\:/)) {
						currentStatusItem.inworkspace = false;
					} else {
						currentStatusItem.inworkspace = true;
					}
				}
			}

			if (line.startsWith('Change')) {
				let [, changetype] = reChangeType.exec(line) || [null, null];

				if (changetype) {
					currentStatusItem.changetype = changetype;
				}
			}

			if (line.startsWith('Workspace')) {
				let [, workspace] = reWorkspace.exec(line) || [null, null];

				if (workspace) {
					currentStatusItem.workspace = workspace;
				}
			}
		}

		if (currentStatusItem !== null && currentStatusItem.inworkspace) {
			statusItems.push(new TFSStatusItem(
				currentStatusItem.resourceUri,
				currentStatusItem.serverpath,
				currentStatusItem.changetype,
				currentStatusItem.workspace,
				currentStatusItem.changeset,
				currentStatusItem.source
			));
		}

		const localRootDir = this.localRoot.toLowerCase().replace(/\\/g, '/') + '/';
		return statusItems.filter(x => x.resourceUri.fsPath.toLowerCase().replace(/\\/g, '/').startsWith(localRootDir));
	}
}