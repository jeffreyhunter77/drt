var assert = require('assert')
  , mockfs = require('mock-fs')
  , fs = require('fs')
  , ffuncs = require('../../lib/file-functions')
;

describe("built-in file functions", function() {

  describe("fileExists()", function() {
    beforeEach(function() {
      mockfs({'test-file.txt': ''});
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("returns true if a file exists at the named path", function() {
      assert(ffuncs.fileExists('test-file.txt'));
    });

    it("returns false otherwise", function() {
      assert(!ffuncs.fileExists('no-such-file.txt'));
    });
  });

  describe("isFile()", function() {
    beforeEach(function() {
      mockfs({'test-file.txt': '', 'test-dir/test-file.txt': ''});
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("returns true if file exists and is a regular file", function() {
      assert(ffuncs.isFile('test-file.txt'));
    });

    it ("returns false if the path exists but is not a regular file", function() {
      assert(!ffuncs.isFile('test-dir'));
    });

    it ("returns false if the path does not exist", function() {
      assert(!ffuncs.isFile('no-such-file.txt'));
    });
  });

  describe("isDir()", function() {
    beforeEach(function() {
      mockfs({'test-file.txt': '', 'test-dir/test-file.txt': ''});
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("returns true if path exists and is a directory", function() {
      assert(ffuncs.isDir('test-dir'));
    });

    it ("returns false if the path exists but is not a directory", function() {
      assert(!ffuncs.isDir('test-file.txt'));
    });

    it ("returns false if the path does not exist", function() {
      assert(!ffuncs.isDir('no-such-dir'));
    });
  });

  describe("readFile()", function() {
    beforeEach(function() {
      mockfs({
        'inquiry.txt': '\u00BFC\u00F3mo est\u00E1s?',
      });
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("reads the entire contents of the file as a string", function() {
      assert.equal(ffuncs.readFile('inquiry.txt'), '\u00BFC\u00F3mo est\u00E1s?');
    });

    it("throws an error if the file cannot be read", function() {
      assert.throws(function() {
        ffuncs.readFile('no-such-file.txt');
      }, /ENOENT/);
    });
  });

  describe("writeFile()", function() {
    beforeEach(function() {
      mockfs({'some-dir/some-file.txt': ''});
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("writes the entire contents of the file as a string", function() {
      ffuncs.writeFile('reply.txt', 'Muy bien, gracias.');
      assert.equal(fs.readFileSync('reply.txt', {encoding: 'utf8'}), 'Muy bien, gracias.');
    });

    it("throws an error if the file cannot be written", function() {
      assert.throws(function() {
        ffuncs.writeFile('some-dir', 'contents');
      }, /./);
    });
  });

  describe("listDir()", function() {
    beforeEach(function() {
      mockfs({
        'some-dir': {
          '.hidden-dir': {'file.txt': ''},
          '.hidden-file': '',
          'dir': {'file.txt': ''},
          'file1': '',
          'file2': ''
        }
      });
    });

    afterEach(function() {
      mockfs.restore();
    });

    it("returns an array listing the contents of the directory", function() {
      assert.deepEqual(
        ffuncs.listDir('some-dir').sort(),
        ['dir', 'file1', 'file2']
      );
    });

    it("includes hidden entries when the 'all' option is true", function() {
      assert.deepEqual(
        ffuncs.listDir('some-dir', {all: true}).sort(),
        ['.hidden-dir', '.hidden-file', 'dir', 'file1', 'file2']
      );
    });

    it("throws an error if the directory cannot be read", function() {
      assert.throws(function() {
        ffuncs.listDir('unknown-dir');
      }, /ENOENT/);
    });

    it("throws an error if an invalid option is provided", function() {
      assert.throws(function() {
        ffuncs.listDir('some-dir', {nonesuch: true});
      }, /nonesuch/);
    });
  });

});
