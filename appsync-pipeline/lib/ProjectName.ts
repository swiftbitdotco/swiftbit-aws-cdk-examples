import changecase = require('change-case');

export class ProjectName {

    private _projectName: string;
    constructor(projectName: string) {
        this._projectName = projectName;
    }

    get toPascalCase(){
        return changecase.pascal(this._projectName);
    }

    get toKebabCase() {
        return changecase.kebab(this._projectName);
    }
}