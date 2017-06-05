import operator
class Poly:
    def __init__(self, *koeff):
        self.koeff = koeff
        self.degree = len(koeff)-1

    def __call__(self, val):
        res = 0
        x = 1
        for k in self.koeff:
            res += x*k
            x *= val
        return res

def durand_kerner(poly, start=complex(.4, .9), epsilon=10**-16):#float('-inf')):
    roots = []
    for e in xrange(poly.degree):
        roots.append(start ** e)
    while True:
        new = []
        for i, r in enumerate(roots):
            new_r = r - (poly(r))/(reduce(operator.mul, [(r - r_1) 
                                     for j, r_1 in enumerate(roots) if i != j]))
            new.append(new_r)
        if all((n == roots[i] or abs(n - roots[i]) < epsilon) for i, n in enumerate(new)):
            return new
        roots = new


print durand_kerner(Poly(-5,3,-3,1))
#poly = Poly([5,3,3,1]
#poly(3)
