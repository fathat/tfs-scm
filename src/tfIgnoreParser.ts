import * as glob from 'glob';
import * as fs from 'fs';
import { GlobPattern } from 'vscode';

export class TFSIgnoreList {

    private globs: GlobPattern[] = [];
    
    constructor(basePath: string, filename: string) {
        const file = fs.readFileSync(filename);
        const strData = file.toString();

        const lines = strData.split('\n').map(m => m.trim());

        for(const line of lines) {
            if(!line) {
                continue;
            }
            
            if(line.startsWith('#')) {
                continue;
            }
            
            this.globs.push(line);
        }
    }

    matches(filename: string) {
        for(const glob of this.globs) {
            
        }
    }

}