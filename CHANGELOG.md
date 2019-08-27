# Change Log

All notable changes to the "tfs-scm" extension will be documented in this file.

## 0.3.2

### Fixed
* Fix issue where checkin would sometimes error because of missing UI info.

## 0.3.1

### Fixed
* Only checkout files in SCM.

## 0.3.0

### Added
* Ask for checkout if read-only file is modified and is in TFS

## 0.2.0

### Added
* Icons for renames and rename-edits

## 0.1.0

### Added
* Support for checkins (experimental!!)

### Fixed
* Sometimes "included changes" changes would be duplicated in other mappings if path names had same root but different folders (C:\Projects\test\ and C:\Projects\testandsomestuff\ for example)

## 0.0.12
### Changes
* Fix multiple roots sometimes matching
* Fix diff names being too long

## 0.0.11
### Changes
* Fix high resource usage on large amounts of files being generated/deleted/updated

## 0.0.10
### Added
* Added a hack to make checkout on save work again.

## 0.0.9
### Changes
* Switch to webpack to make extension smaller/faster

## 0.0.8
### Changes
* Don't show TFS mappings not relevant to current workspace

## 0.0.7
### Added
* Support for multiple workspaces open at once, with multiple mappings per workspace.

## 0.0.6
### Added
* For pending changes, implement include-all and exclude-all, along with discard

## 0.0.5
### Changes
* Fix some issues with package, icon sizing

## 0.0.4
### Added
* Auto register as TFS SCM

## 0.0.3
### Added
- Added a workspace view
### Changed
- Fixed status icons

## 0.0.2
### Added
- Initial release
