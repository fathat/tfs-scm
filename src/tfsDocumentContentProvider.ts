import { tfcmd } from './tfsCmd';
import { TextDocumentContentProvider, Disposable, Event, Uri, ProviderResult, CancellationToken, EventEmitter, WorkspaceFolder } from 'vscode';

export class TFSDocumentContentProvider implements TextDocumentContentProvider, Disposable {

	private _onDidChange = new EventEmitter<Uri>();

	constructor() { }

	get onDidChange(): Event<Uri> {
		return this._onDidChange.event;
	}

	provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string> {
		if (token.isCancellationRequested) { return "Canceled"; }

		return new Promise((resolve, reject) => {

			//add a path called tfs:null that just resolves to empty
			if (uri.fsPath === "null") {
				resolve('');
			}

			tfcmd(["vc", "view", `${uri.fsPath}`, "/console"])
				.then((spawnProcessResult) => {
					resolve(spawnProcessResult.stdout);
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	dispose() {
		this._onDidChange.dispose();
	}

}