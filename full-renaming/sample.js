var m = 1080;

if (window.screen.availWidth == m) {
  console.log("Yes");
}

function chunkData(e, t) {
  var n = [];
  var r = e.length;
  var i = 0;
  for (; i < r; i += t) {
    if (i + t < r) {
      n.push(e.substring(i, i + t));
    } else {
      n.push(e.substring(i, r));
    }
  }
  return n;
}

function sumTree(t){
	var c=t[1];
	if(t[0]){
		c+=sumTree(t[0])
	}
	if(t[2]){
		c+=sumTree(t[2])
	}
	return c
}