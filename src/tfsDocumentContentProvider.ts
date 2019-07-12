import { tfcmd } from './tfsCmd';
import { TextDocumentContentProvider, Disposable, Event, Uri, ProviderResult, CancellationToken, EventEmitter, WorkspaceFolder } from 'vscode';
import * as path from 'path';

export class TFSDocumentContentProvider implements TextDocumentContentProvider, Disposable {

	private _onDidChange = new EventEmitter<Uri>();

	constructor () { }

	get onDidChange(): Event<Uri> {
		return this._onDidChange.event;
	}

	provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string> {
		if (token.isCancellationRequested) { return "Canceled"; }

		return new Promise((resolve, reject) => {
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