import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { TFSSourceControlManager } from './tfsSourceControlManager';
import * as cmdParse from './tfsCmdParser';
import * as querystring from 'querystring';

const buildTFSUrl = (collection:string, serverPath:string) => {
  const fragment = querystring.stringify({
    path: serverPath
  });

  return `${collection}/_versionControl#${fragment}`;
};

// Workaround for https://github.com/microsoft/vscode/issues/25852
const hasUriEscapeIssue = !String(vscode.Uri.parse("http://host/#test=value")).includes("test=value");
const fixUri = (uri: Uri, expectedUri: string) => {
  if (hasUriEscapeIssue) {
    (uri as any)._formatted = expectedUri;
  }
};

export async function openInBrowser(scm: TFSSourceControlManager, uri: Uri) {
    const workfoldCmdFn = (fsPath:string) => scm.cmd(["workfold", fsPath]).then(res => cmdParse.objectFromTFS(res.stdout));
    const infoCmdFn = (fsPath:string) => scm.cmd(["info", fsPath]).then(res => cmdParse.info(res.stdout));

    const [workfold, info] = await Promise.all([workfoldCmdFn(uri.fsPath), infoCmdFn(uri.fsPath)]);
    
    if (!info.localInformation || !info.localInformation.serverPath) {
      throw new Error(`The file is not under version control`);
    }
  
    const vcsUrl = buildTFSUrl(workfold.collection, info.localInformation.serverPath);
    const urlToOpen = vscode.Uri.parse(vcsUrl);
    fixUri(urlToOpen, vcsUrl);
    vscode.commands.executeCommand("vscode.open", urlToOpen);
  }
  