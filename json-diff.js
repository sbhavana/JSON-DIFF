var fs = require("fs");

/*
    Objective: To generate diff of two JSON 'objects': Diff(A,B)
    Parameters: filename a.json containing Object A
                filename b.json containing Object B
 */
var jsonDiff = function() {
    var filepathA = process.argv[2];
    var filepathB = process.argv[3];
    var diffStr = '';

    // Read JSON object A from file
    fs.readFile(filepathA, 'utf-8', function(err,dataA) {
       if (err) {
           return HandleError(err);
       }
       try {
           // Parse JSON object to a JS object
           var A = JSON.parse(dataA);
       } catch(err) {
           return HandleError(err);
       }

       // Read JSON object B from file
       fs.readFile(filepathB, 'utf-8', function(err,dataB) {
           if (err) {
               return HandleError(err);
           }
           try {
               // Parse JSON object to a JS object
               var B = JSON.parse(dataB);
           } catch(err) {
               return HandleError(err);
           }

           //Generate the diff between A and B
           var DiffObject = {};
           try {
               DiffObject = DiffValue(A, B);
           } catch(err) {
               return HandleError(err);
           }

           // Convert the diff object to a string and display on the console
           try {
               diffstr = JSON.stringify(DiffObject, null, 4);
           } catch(err) {
               return HandleError(err);
           }

           console.log(diffstr);
       });
    });
}();

var HandleError = function (err) {
    return console.log(err.message);
}

var IsArray = function(A) {

    return ( ( A )                                      &&
             ( typeof (A) === 'object' )                &&
             ( typeof (A.length) === 'number')          &&
             ( typeof (A.splice) === 'function')        &&
             ( ! (A.propertyIsEnumerable('length')))
           );
}

var IsObjEmpty = function isEmpty(obj) {

    for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
            return false;
        }
    }
    return true;
}

/*
 Objective: This function is the wrapper for calling specialized diff functions
            depending on the type of the input
 */
var DiffValue = function(valA, valB) {
    var err;
    var temp = {};
    var typeA = typeof(valA);
    var typeB = typeof(valB);

    // If type is different (both scalar or object), record this as a value change
    if ( (typeA != typeB) ) {

        temp.old = valA;
        temp.new = valB;
        return temp;
    }

    // handle cases of null, object and array types
    if ( (typeA === 'object') && (typeB === 'object')) {

        var IsArray_valA = IsArray(valA);
        var IsArray_valB = IsArray(valB);

        // If both A and B are null, record no change
        if ( (valA === null) && (valB === null) ) { return null; }

        if ( (valA === null) && (valB !== null) ||
             (valA !== null) && (valB === null) ||
             (IsArray_valA   &&  !IsArray_valB) ||
             (IsArray_valB   &&  !IsArray_valA)
           ) {

            temp.old = valA;
            temp.new = valB;
            return temp;
        }

        // If both A and B are arrays, look inside them to see if they are different, using DiffArr()
        if ( IsArray_valA && IsArray_valB) {

            var arraydiff = {};
            try {
                arraydiff = DiffArr(valA, valB);
            } catch(err) {
                HandleError(err);
            }
            if ( ( IsObjEmpty (arraydiff) )                                                  ||
                 ( arraydiff.elementsAdded   && arraydiff.elementsAdded.length   === 0  )    &&
                 ( arraydiff.elementsDeleted && arraydiff.elementsDeleted.length === 0  )    &&
                 ( arraydiff.elementsChanged && arraydiff.elementsChanged.length === 0  )
                ) {
                return null;
            }
            temp.arraydiff = arraydiff;
            return temp;
        }

        // If both A and B are objects, look inside them to see if they are different, using DiffObj()
        else {

            var objdiff = {};
            try {
                objdiff = DiffObj(valA, valB);
            } catch(err) {
                return HandleError(err);
            }
            if ( ( IsObjEmpty (objdiff) )                                                  ||
                 ( objdiff.elementsAdded     && objdiff.elementsAdded.length   === 0  )    &&
                 ( objdiff.elementsDeleted   && objdiff.elementsDeleted.length === 0  )    &&
                 ( objdiff.elementsChanged   && objdiff.elementsChanged.length === 0  )
                ) {
                return null;
            }
            temp.objdiff = objdiff;
            return temp;
        }

    }

    // Case of scalar types, when type is same
    if ( ( (typeA === 'number') && (typeB === 'number') )   ||
         ( (typeA === 'string') && (typeB === 'string') )   ||
         ( (typeA === 'boolean') && (typeB === 'boolean') )
       ) {

        if (valA === valB) { return null; }
        else {
            temp.old = valA;
            temp.new = valB;
            return temp;
        }
    }

    return temp;
}

/*
 Objective: This function does a diff of two input arrays.
            It calls DiffValue to compare two corresponding values.
 */
var DiffArr = function(A, B) {
    var err = {};
    var i,j = 0;
    var diffArr = [];
    var DiffArray = {};

    for ( i = 0; (i < A.length) && (i < B.length); i++) {
        var temp = {};

        try {
            temp = DiffValue(A[i], B[i]);
        } catch (err) {
            HandleError(err);
        }
        if (temp !== null) {
            temp.pos = i;
            diffArr[j++] = temp;
        }
    }

    if (j) {
        DiffArray.elementsChanged = diffArr;
    }

    j = 0;
    diffArr = [];
    for ( ; i < A.length ; i++) {
        temp = {};
        temp.pos = i;
        temp.value = A[i];
        diffArr[j++] = temp;
    }
    if (j) {
        DiffArray.elementsDeleted = diffArr;
    }

    j = 0;
    diffArr = [];
    for ( ; i < B.length ; i++) {
        temp = {};
        temp.pos = i;
        temp.value = B[i];
        diffArr[j++] = temp;
    }
    if (j) {
        DiffArray.elementsAdded = diffArr;
    }

    return DiffArray;
}

/*
 Objective: This function does a diff of two input objects.
            It calls DiffValue to compare two corresponding values.
 */
var DiffObj = function(A, B) {
    var err = {};
    var diffObj = [];
    var DiffObject = {};
    var i;
    var key;


    diffObj = [];
    i = 0;
    for (key in A) {
        if ( !(key in B) ) {
            var temp = {};

            temp.key = key;
            temp.value = A[key];
            diffObj[i++] = temp;
        }
    }
    if (i) {
        DiffObject.elementsDeleted = diffObj;
    }

    diffObj = [];
    i = 0;
    for (key in B) {
        if ( !(key in A) ) {
            var temp = {};

            temp.key = key;
            temp.value = B[key];
            diffObj[i++] = temp;
        }
    }

    if (i) {
        DiffObject.elementsAdded = diffObj;
    }

    diffObj = [];
    i = 0;
    for (key in A) {
        if ( (key in B) ) {
            var temp = {};

            try {
                temp = DiffValue(A[key], B[key]);
            } catch (err) {
                HandleError(err);
            }
            if (temp !== null) {
                temp.key = key;
                diffObj[i++] = temp;
            }
        }
    }
    if (i) {
        DiffObject.elementsChanged = diffObj;
    }

    return DiffObject;
}
