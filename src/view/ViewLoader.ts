import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { load as yamlLoad } from "js-yaml";
import { Base64 } from 'js-base64';

import { CommandAction, ICommand } from "./model";

export default class ViewLoader {
  private readonly _panel: vscode.WebviewPanel | undefined;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  public update(text: string, fileName: string) {
    if (this._panel) {
      const encodedText = this.encodeContent(text, fileName);
      this._panel.webview.html = this.getWebviewContent(encodedText, fileName);
    }
  }

  constructor(text: string, fileName: string, extensionPath: string) {
    this._extensionPath = extensionPath;

    const encodedText = this.encodeContent(text, fileName);
    console.log(text);
    if (encodedText) {
      this._panel = vscode.window.createWebviewPanel(
        "configView",
        "UI Builder",
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(extensionPath, "uiBuilder")),
            vscode.Uri.file(path.join(extensionPath, "patternfly-builder/dist")),
          ],
        }
      );

      this._panel.webview.html = this.getWebviewContent(encodedText, fileName);

      // this._panel.webview.onDidReceiveMessage(
      //   (command: ICommand) => {
      //     switch (command.action) {
      //       case CommandAction.Save:
      //         // this.saveFileContent(fileUri, command.content);
      //         return;
      //     }
      //   },
      //   undefined,
      //   this._disposables
      // );

      // Handle messages from the webview
      this._panel.webview.onDidReceiveMessage(
        (message: any) => {
          switch (message.command) {
            case 'codeEditor':
              vscode.window.showErrorMessage(message.text);
              fs.writeFileSync(fileName, message.text);
              return;
          }
        },
        undefined,
        this._disposables
      );
    }
  }

  private getWebviewContent(text: string, filePath: string): string {
    // Local path to main script run in the webview
    const reactAppPathOnDisk = vscode.Uri.file(
      // path.join(this._extensionPath, "uiBuilder", "uiBuilder.js")
      path.join(this._extensionPath, "patternfly-builder/dist", "index.js")
    );
    const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });
    // @ts-ignore
    const pfStyles = this._panel?.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, "patternfly-builder/dist", "patternfly.css")));
    // @ts-ignore
    const pfAddonsStyles = this._panel?.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, "patternfly-builder/dist", "patternfly-addons.css")));
    // @ts-ignore
    const otherStyles = this._panel?.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, "patternfly-builder/dist", "styles.css")));
    // return fs.readFileSync(reactAppUri.fsPath,'utf8');
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UI Builder</title>

        <meta http-equiv="Content-Security-Policy"
                    content="default-src 'self' 'unsafe-inline';
                             img-src https: 'self' 'unsafe-inline';
                             script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
                             style-src vscode-resource: 'self' 'unsafe-inline';">

        <script>
          window.acquireVsCodeApi = acquireVsCodeApi;
          window.initialData = "${text}";
          window.filePath = "${filePath}";
        </script>
        <link href="${pfStyles}" rel="stylesheet">
        <link href="${pfAddonsStyles}" rel="stylesheet">
        <link href="${otherStyles}" rel="stylesheet">
    </head>
    <body>
        <div id="root"></div>

        <script src="${reactAppUri}"></script>
    </body>
    </html>`;
    return html;
  }

  private encodeContent(text: string, fileName: string): any {
    if (fileName.endsWith(".yaml")) {
      return Base64.encode(JSON.stringify(yamlLoad(text)));
    }
    return Base64.encode(text);
  }

  private saveFileContent(fileUri: vscode.Uri, config: string) {
    if (fs.existsSync(fileUri.fsPath)) {
      const content: string = JSON.stringify(config);
      fs.writeFileSync(fileUri.fsPath, content);

      vscode.window.showInformationMessage(
        `???? Configuration saved to ${fileUri.fsPath}`
      );
    }
  }
}
