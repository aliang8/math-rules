function Complex(real, imaginary) {
    this.real = 0;
    this.imaginary = 0;
    this.real = (typeof real === 'undefined') ? this.real : parseFloat(real);
    this.imaginary = (typeof imaginary === 'undefined') ? this.imaginary : parseFloat(imaginary);
}

function display_complex(re, im) {
    if(im === '0') return '' + re;
    if(re === 0) return '' + im + 'i';
    if(im < 0) return '' + re + im + 'i';
    return '' + re + '+' + im + 'i';
}

class Poly {
    constructor(coeff) {
        this.coeff = coeff
        this.degree = coeff.length - 1
    }

    eval(value) {
        var res = 0
        var x = 1
        for (var i = 0; i < this.coeff.length; i++){
            res += x * this.coeff[i]
            x *= value
        }
        return res
    }
}

function durand_kerner(poly, start = new Complex(.4, .9), epsilon = 10 * Math.pow(10,-6)){
    const roots = []
    for (var i = 1; i <= poly.degree; i++) {
        roots.append(start )
    }
}

const poly = new Poly([5,3,3,1])
durand_kerner(poly)
