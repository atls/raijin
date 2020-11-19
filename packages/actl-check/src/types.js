export var AnnotationLevel;
(function (AnnotationLevel) {
    AnnotationLevel["Warning"] = "warning";
    AnnotationLevel["Failure"] = "failure";
})(AnnotationLevel || (AnnotationLevel = {}));
export var Conclusion;
(function (Conclusion) {
    Conclusion["Success"] = "success";
    Conclusion["Failure"] = "failure";
    Conclusion["Neutral"] = "neutral";
    Conclusion["Cancelled"] = "cancelled";
    Conclusion["TimedOut"] = "timed_out";
    Conclusion["ActionRequired"] = "action_required";
})(Conclusion || (Conclusion = {}));
