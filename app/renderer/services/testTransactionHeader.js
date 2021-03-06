import Constants from '../configs/Constants';
import fastXmlParser from 'fast-xml-parser';
import SCRIPTTransactionNames from '../configs/SCRIPT_Transaction_Names';
import he from 'he';

let parseTransactionHeader = (input) => {

    var output = {};
    var type = '';
    var version = '';
    var transaction = '';
    var segmentSeparator = '';
    var fieldSeparator = '';
    var groupSeparator = '';
    var isRequest;
    
    var xmlOptions = {
        attributeNamePrefix : "_",
        attrNodeName: "attr", //default is 'false'
        textNodeName : "#text",
        ignoreAttributes : false,
        ignoreNameSpace : false,
        allowBooleanAttributes : false,
        parseNodeValue : true,
        parseAttributeValue : false,
        trimValues: true,
        cdataTagName: "__cdata", //default is 'false'
        cdataPositionChar: "\\c",
        localeRange: "", //To support non english character in tag/attribute values.
        parseTrueNumberOnly: false,
        attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),//default is a=>a
        tagValueProcessor : a => he.decode(a) //default is a=>a
    };
    if( input.indexOf("<?xml")=== -1){
      
        var stripedHtml = input.replace(/<[^>]+>/g, "");
        var stripedHtml = stripedHtml.replace(/&nbsp;/g, ' ');
        // remove any leading control characters, e.g. stx; 
        // do not strip out control characters x1C-x1E
        var str = stripedHtml.replace(/[\x00-\x1B\x7F-\x9F]/g, "");
    } else {
        str = input;
    }

    switch(str.substring(0,3)) {
        case "ISA":
            type = "X12";
            fieldSeparator = str.substring(3,4);
            var gsIndex = str.indexOf(segmentSeparator + "GS");

            if(gsIndex === -1) {
                console.log ("error, no GS found, invalid format, so report invalid X12");
            }
            
            segmentSeparator = str.substring(gsIndex-1, gsIndex);

            var stIndex = str.indexOf(segmentSeparator + "ST");
            
            if(gsIndex === -1) {
                console.log ("error, no ST found, invalid format, so report invalid X12");
            }

            var gsEnd = str.indexOf(segmentSeparator, gsIndex);
            var gsSegment = str.substring(gsIndex, gsEnd);
            var last = gsSegment.lastIndexOf(fieldSeparator);
            version =  gsSegment.substring(last + 1, gsSegment.length);

            var stEnd = str.indexOf(segmentSeparator, stIndex + 1);
            var stSegment = str.substring(stIndex + 1, stEnd);
            last = stSegment.indexOf(fieldSeparator);
            transaction = stSegment.substring(last + 1, stSegment.indexOf(fieldSeparator,last + 1));

            break;
        case "MSH":
            type = "HL7";
            break;
        case "<?x":
        // Now what is it, NCPDP or HL7 or something else?
            if((str.indexOf("www.ncpdp.org") > -1)
                && (str.indexOf("<Message") > -1 )) {
                if(fastXmlParser.validate(str)=== true){//optional
                    var jsonObj = fastXmlParser.parse(str, xmlOptions);
                    const {_version, _release} = jsonObj.Message.attr;
                    type = "SCRIPT";
                    version = _version.replace(/^0+/, '') + "." + _release.replace(/^0+/, '');
                    const rootNode = Object.keys(jsonObj.Message.Body);
                    if (rootNode.length === 1) {
                        transaction = SCRIPTTransactionNames[rootNode]
                    } else {
                        console.log("XML not valid")    
                    }
                } else {
                   console.log("XML not valid")    
                }
            } else if (str.indexOf("hl7-org") > -1) {
                // it's HL7
            } else if(str.indexOf("TransactionDomain=\"SCRIPT\"") > -1) {
                if(fastXmlParser.validate(str)=== true){
                    var jsonObj = fastXmlParser.parse(str, xmlOptions);
                    const {_TransactionVersion, _TransactionDomain} = jsonObj.Message.attr;
                    type = _TransactionDomain;
                    version = _TransactionVersion;
                    const rootNode = Object.keys(jsonObj.Message.Body);
                    if (rootNode.length === 1) {
                        transaction = SCRIPTTransactionNames[rootNode]
                    } else {
                        console.log("XML not valid")    
                    }
                }
            
            } else {
                console.log("I don't know")
                type = "UNKNOWN";
                version = "N/A";
                transaction = "N/A";
            }


            break;
        default:
            const { NCPDP_RECORD_SEP } = Constants;
            var rsIndex = str.indexOf('\x1E');
            var gsIndex = str.indexOf('\x1D');

            if(rsIndex !== -1) {
                // Note: in Prior Auth the group separatar can appear right after the header
                var idx = (rsIndex < gsIndex) || (gsIndex === -1) ?  rsIndex : gsIndex;
                type = "NCPDP";
                segmentSeparator = '\x1E';
                fieldSeparator = '\x1C';
                groupSeparator = '\x1D';
                
                switch(idx) {

                    case 56: // B1 or B2 Claim Request
                        isRequest = true;
                        version = str.substring(6,8);
                        var add;
                        var t = str.substring(8,10)
                        switch(t) {
                        case "B1":
                            add = "Claim Billing Request";
                            break;
                        case "B2":
                            add = "Claim Reversal Request";
                            break;
                        case "B3":
                            add = "Rebill Request";
                            break;
                        case "E1":
                            add = "Eligibility Verification Request";
                            break;
                        case "S1":
                           add = "Service Billing Request";
                           break;
                        case "P3":
                           add = "Prior Authoirzation Inquiry Request";
                           break;
                        case "P4":
                           add = "Prior Authoirzation Only Request";
                           break;
                        }
                        transaction = t + " " + add;
                        break;
                    case 31: 
                        isRequest = false;
                        version = str.substring(0,2);
                        var add;
                        var t = str.substring(2,4);
                        switch(t){
                            case "B1":
                                add = "Claim Billing Response";
                                break;
                            case"B2":
                                add = "Claim Reversal Response";
                                break;
                            case "B3":
                                add = "Rebill Response";
                                break;
                            case "E1":
                                add = "Eligibility Verification Response";
                                break;
                            case "S1":
                                add = "Service Billing Response";
                                break;
                            case "P3":
                                add = "Prior Authoirzation Inquiry Response";
                                break;
                             case "P4":
                                add = "Prior Authoirzation Only Response";
                                break;
                        }
                        transaction = t + " " + add;
                        break;
                    default:
                        break;                        
                } 
            } else {
                type = "UNKNOWN";
                version = "N/A";
                transaction = "N/A";
            }
            break;
    }

    output = {"type" : type, "version": version, "transaction": transaction, 
        "segmentSeparator": segmentSeparator, "fieldSeparator": fieldSeparator, 
        "groupSeparator" : groupSeparator, "isRequest" : isRequest};

    return output;
}

export default parseTransactionHeader;