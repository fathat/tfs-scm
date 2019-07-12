
// converts something like "Local path" to "localPath"
export function labelToKey(str: string) {
    if (!str) {
        return "";
    }
    const key = str
        .split(/\s+/g)
        .map(part => part[0].toUpperCase() + part.substr(1).toLowerCase())
        .join("");

    return key[0].toLowerCase() + key.substr(1);
}

export function objectFromTFS(str: string): any {
    const noItemsMatchRe = /^No items match\s+(.+)/;
    const lineRe = /(\s*)(?:([=]{3,})|(?:([^:]+):(.*)))(?:\r\n)/g;
    const tok = (indent: string, value: string) => ({ indent, value });
    const stack = [];
    let current: any = {};
    let prevKey: string = "", matches: RegExpExecArray | null;

    if (!str) {
        return null;
    }

    if ((matches = noItemsMatchRe.exec(str)) !== null) {
        return {
            localInformation: {
                localPath: matches[1].trim()
            }
        };
    }

    stack.push(tok("", current));

    while ((matches = lineRe.exec(str)) !== null) {
        const [, indent, isComment, _key, _value] = matches;
        if (isComment) {
            continue;
        }
        const key = labelToKey(_key.trim());
        const value = _value.substr(1);

        if (indent.length > stack[stack.length - 1].indent.length) {
            if (current[prevKey]) {
                prevKey += "Items";
            }
            current[prevKey] = {};
            current = current[prevKey];
            stack.push(tok(indent, current));
        } else if (indent.length < stack[stack.length - 1].indent.length) {
            while (indent.length !== stack[stack.length - 1].indent.length) {
                stack.pop();
            }
            current = stack[stack.length - 1].value;
        }
        current[key] = value;
        prevKey = key;
    }

    return stack[0].value;
}

export class LocalInformation {
    localPath?: string;
    serverPath?: string;
    changeset?: string;
    change?: string;
    type?: string;    
}

export class ServerInformation {
    serverPath?: string;
    changeset?: string;
    deletionID?: string;
    lockOwner?: string;
    lastModified?: string;
    type?: string;
    fileType?: string;
    size?: string;
}

export class TFSInfoCmdOutput {
    localInformation: LocalInformation | undefined;
    serverInformation: ServerInformation | undefined;
}

export function info(str: string) {
    return objectFromTFS(str) as TFSInfoCmdOutput;
}