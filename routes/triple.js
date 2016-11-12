/**
 * Created by roland on 12.11.16.
 */


function Triple(subject, predicate, object) {

    this.subject = subject;
    this.predicate = predicate;
    this.object = object;

}

Triple.prototype.equals = function (triple) {
    if (this.subject != triple.subject)
        return false;
    if (this.predicate != triple.predicate)
        return false;

    return this.object == triple.object;
};

exports.Triple = Triple;