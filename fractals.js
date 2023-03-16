

const power_offset = 0;
const escapeno = 2;
let upper_pwrs, upper_idxs, lower_pwrs, lower_idxs;


function createFraction(nSubExpressions, isNumerator, powers, indices) {
    if (isNumerator) {
        powers.push(nSubExpressions + power_offset);
        indices.push((nSubExpressions - 1) * 2);
    } else {
        powers.push(nSubExpressions + power_offset);
        indices.push(((nSubExpressions - 1) * 2) + 1);
    }
    if (nSubExpressions - 1 > 0) {
        return createFraction(nSubExpressions - 1, isNumerator, powers, indices);
    } else {
        return [powers, indices];
    }
}

function create_formula(n_sub_expressions) {
    let upper_pwrs = [];
    let upper_idxs = [];
    let lower_pwrs = [];
    let lower_idxs = [];

    [upper_pwrs, upper_idxs] = createFraction(n_sub_expressions, true, [], []);
    [lower_pwrs, lower_idxs] = createFraction(n_sub_expressions, false, [], []);

    return [upper_pwrs, upper_idxs, lower_pwrs, lower_idxs];
}

function julia_set_jit(statevector_data, max_iterations, n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs, height, width, x = 0, y = 0, zoom = 1) {
    // To make navigation easier we calculate these values

    const xWidth = 1.5;
    const xFrom = x - xWidth / zoom;
    const xTo = x + xWidth / zoom;

    const yHeight = 1.5 * height / width;
    const yFrom = y - yHeight / zoom;
    const yTo = y + yHeight / zoom;

    //Here the actual algorithm starts and the z parameter is defined for the Julia set function
    const xArr = Array.from({ length: width }, (_, i) => xFrom + i * (xTo - xFrom) / (width - 1));
    const yArr = Array.from({ length: height }, (_, i) => yFrom + i * (yTo - yFrom) / (height - 1));

    let zArr = Array.from({ length: height });
    for (let i = 0; i < height; i++) {
        zArr[i] = Array.from({ length: width });
        for (let j = 0; j < width; j++) {
            zArr[i][j] = math.complex(xArr[j], yArr[i]);
        }
    }

    // To keep track in which iteration the point diverged
    let div_time = new Array(height);
    for (let i = 0; i < height; i++) {
        div_time[i] = new Array(width).fill(max_iterations - 1);
    }
    // To keep track on which points did not converge so far
    let m = new Array(height);
    for (let i = 0; i < height; i++) {
        m[i] = new Array(width).fill(true);
    }

    return fractalRecursion(0, div_time, m, zArr, statevector_data, n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs, height, width, max_iterations)
}



//main function
function calcFractal(statevector_data,j, div_time, m, zArr, size, max_iterations) {
    /*const dpino = 50; // 300 // 1200 // 300 for high res plotting
    const figuresize = 10; // 40 // 20 
    const size = figuresize * dpino; // 6000 // 1000 // figsize=20 x 20 with dpi=300 -> size = 20x300=6000*/
    const height = size;
    const width = size;


    const [n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs] = loadStateVectorParameters(statevector_data)



    //determines if its the initial phase or the recursive phase.
    const [div_timeResult, mResult, zArrResult] = j == 0 ? julia_set_jit(statevector_data, max_iterations, n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs, height, width) : fractalRecursion(j, div_time, m, zArr, statevector_data, n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs, height, width, max_iterations)

    return [div_timeResult, mResult, zArrResult];
}


function fractalRecursion(j, div_time, m, zArr, statevector_data, n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs, height, width, max_iterations) {
    const upper_pwrs_slice = upper_pwrs.slice();
    const lower_pwrs_slice = lower_pwrs.slice();
    const upper_idxs_slice = upper_idxs.slice();
    const lower_idxs_slice = lower_idxs.slice();


    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (m[x][y]) {
                // Create first sub-equation of Julia mating equation
                let uval = math.pow(zArr[x][y], upper_pwrs[0])
                let lval = math.pow(zArr[x][y], lower_pwrs[0])
                //Add middle sub-equation(s) of Julia mating equation
                for (let i = 0; i < n_sub_expressions - 1; i++) {
                    uval = math.add(uval, math.multiply(statevector_data[upper_idxs_slice[i]], math.pow(zArr[x][y], upper_pwrs_slice[i + 1])))
                    lval = math.add(lval, math.multiply(statevector_data[lower_idxs_slice[i]], math.pow(zArr[x][y], lower_pwrs_slice[i + 1])))
                }
                // Add final sub-equation of Julia mating equation
                uval = math.add(uval, statevector_data[upper_idxs_slice[n_sub_expressions - 1]]);
                lval = math.add(lval, statevector_data[lower_idxs_slice[n_sub_expressions - 1]]);
                zArr[x][y] = math.divide(uval, lval);
                if (math.abs(zArr[x][y]) > escapeno) {
                    m[x][y] = false;
                    div_time[x][y] = j;
                }

            }
        }
    }
    return [div_time, m, zArr]
}

//loads the statevector 
function loadStateVectorParameters(statevector_data) {
    number_of_qubits = math.log2(statevector_data.length)
    console.log("number of qubits detected in statevector: ", number_of_qubits)
    if (!Number.isInteger(number_of_qubits)) { throw new Error('invalid statevector size, should be log2(n) = integer, statevector size = ', statevector_data.length) }
    let n_sub_expressions;
    if (number_of_qubits === 1) {
        n_sub_expressions = number_of_qubits;
    } else {
        n_sub_expressions = (2 ** number_of_qubits) / 2;
    }

    // Calculate the powers and indexes
    [upper_pwrs, upper_idxs, lower_pwrs, lower_idxs] = create_formula(n_sub_expressions);

    return [n_sub_expressions, upper_pwrs, upper_idxs, lower_pwrs, lower_idxs]
}



//checks if 2 statevectors are equal
function isStatevectorsEqual(statevector1, statevector2) {
    if (statevector1.length != statevector2.length) { return false }
    for (let i = 0; i < statevector1.length; i++) {
        if (statevector1[i].re != statevector2[i].re) { return false }
        if (statevector1[i].im != statevector2[i].im) { return false }
    }
    return true;
}


