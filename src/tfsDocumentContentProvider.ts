import { tfcmd } from './tfsCmd';
import { TextDocumentContentProvider, Disposable, Event, Uri, ProviderResult, CancellationToken, EventEmitter } from 'vscode';

export class TFSDocumentContentProvider implements TextDocumentContentProvider, Disposable {

	private _onDidChange = new EventEmitter<Uri>()

	get onDidChange(): Event<Uri> {
		return this._onDidChange.event;
	}

	provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string> {
		if (token.isCancellationRequested) { return "Canceled"; }

		return new Promise((resolve, reject) => {
			tfcmd(["vc", "view", `"${uri.fsPath}"`, "/console"])
				.then((spawnProcessResult) => {
					resolve(spawnProcessResult.stdout)
				})
				.catch(err => reject(err));
		});
	}

	dispose() {
		this._onDidChange.dispose();
	}

}