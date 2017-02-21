#pakval

##Overview

Small utility to validate a Moogsoft Solution Pak .zip

Command line only.

  Usage: pakval [options] <zip file>

  Options:
  
    -h, --help     output usage information
    -V, --version  output the version number
    -d, --debug    Debug level output
    -i, --info     Suppress info level output

The content of the zip is extracted localy and then the directory structure, JSON and content are analysed for syntax and cross references.

Example:

 `pakval -i AnsibleTower-1.0`
 
Outputs only warn and error level mesages from the AnsibleTower-1.0.zip Solution Pak.

##Installation

Download and from the directory with the package.json run.

    npm install
    npm link

Link to a directory on your path if requred, or run localy with ./

##Licence

(c) 2017 Moogsoft Inc. Licence MIT, see LICENCE.