# drt

A dependency resolution tool.

This is an experimental javascript-based build. It is still a work in progress.

## Usage

Build rules are assigned to the global variable `rules`. They take the format:

```javascript
rules = {
  dependent: {
    dependsOn: 'prerequisite'
  },

  prerequisite: {
    commands: 'build prerequisite'
  }
}
```

Rules can specify a `dependsOn` key listing on or more prerequisites (as either a string or array of strings). They can also specify a `commands` key which also accepts a single entry or an array. If a command is a string, it is executed in a shell. If it is a function, it is evaluated. If the function returns a string, the resulting string is run in a shell.


Currently it provides the following functions:

 * **include(**filename**)** - Includes another build script. The include path is specified in `drt.include_path` (an array of search paths).
 * **fileExists(**filename**)** - Tests for the existence of a path.
 * **isFile(**filename**)** - Returns true if path exists and is a regular file.
 * **isDir(**filename**)** - Returns true if path exists and is a directory.
 * **readFile(**filename**)** - Returns the entire contents of the named file.
 * **writeFile(**filename, contents**)** - Writes contents to a file, replacing all existing content.
 * **listDir(**dirname**)** - Returns a list of the contents of a directory, excluding any entries for `.` or `..`.
