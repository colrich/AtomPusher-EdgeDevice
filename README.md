# AtomPusher-Sensor
### The IoT Sensor component of the AtomPusher system

* Create the 'Thing' that represents this sensor
  - Go to the AWS IoT console
  - Click 'Create a resource'
  - Click 'Create a thing'
  - Give it a name, click 'Create'; I called this one AP-S-BostonLatest because it will process the latest news from boston.com
* Create the 'Device Certificate' that identifies this thing to the AWS IoT system
  - Click 'Create a resource'
  - Click 'Create a certificate'
  - Click '1-Click certificate create'
  - Download the public key, private key, and certificate files. Save them somewhere safe as this is the only chance you have to retrieve them
  - In the panel below, check the checkbox in the bottom of the box representing your new certificate, then choose 'Activate' from the 'Actions' dropdown in the upper right of the panel
* (Only do this once) Create a 'Policy' to govern what your sensor can do
  - Click 'Create a resource'
  - Click 'Create a policy'
  - Give it a unique name
  - In the action field, enter 'iot:*'
  - In the resource field, enter '*'
  - Click 'Create'
* Attach the 'Policy' to your 'Device Certificate'
  - In the bottom panel, select your device certificate
  - From the 'Actions' menu in the upper right corner of the panel, choose 'Attach a policy'
  - Type the name of your policy in the box
  - Click 'Attach'
* Attach the 'Thing' you just created to the 'Device Certificate' we have created and configured
  - In the bottom panel, select your device certificate
  - From the 'Actions' menu in the upper right corner of the panel, choose 'Attach a thing'
  - Type the name of your thing in the box
  - Click 'Attach'
* Prepare the sensor code
  - Clone this repository: https://github.com/colrich/AtomPusher-Sensor.git
  - Change in to the AtomPusher-Sensor directory
  - Create a subdirectory called 'certs'
  - Move the private key and certificate files in to the 'certs' directory
  - Download this file: https://www.symantec.com/content/en/us/enterprise/verisign/roots/VeriSign-Class%203-Public-Primary-Certification-Authority-G5.pem and place it in the 'certs' directory
  - Rename the files in the 'certs' directory
    - Name the private key 'private.pem.key'
    - Name the certificate 'certificate.pem.crt'
    - Name the Verisign Root CA file 'root-CA.crt'
  - In the root directory of this repository (the directory that contains 'package.json') run 'npm install'
  - Edit the manifest.yml to customize it for the feed this sensor monitors
    - Modify the name to a unique value (using the 'Thing' name is a good practice)
    - Modify the command; you need to specify the URL of the feed and the tag that identifies this feed in the system. A valid entry looks like: 'command: node AtomPusher-Sensor.js -f certs/ -u "http://www.boston.com/feed" -t "bostonlatest"'
* Push the sensor code
  - In the root directory of this repository, run 'cf push'
  - The sensor prints useful information to the logs; monitor them to ensure that data is flowing through the system
