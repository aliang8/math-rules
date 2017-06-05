import {first_deriv, newton_raphson} from '../lib/rules.js'

var f = function (x) { return Math.pow(x,3) + 3 * Math.pow(x,2) + 3 * x + 1 ; }

newton_raphson(f, -2)
