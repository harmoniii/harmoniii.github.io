/* zeroing score */
	var score = 0;
	/*image change*/
	function imagechange() {
        var Image_Id = document.getElementById('getImage');
        if (Image_Id.src.match("1.png")) { // if default pic
		if(document.getElementById('selectsound').value == "val1") {
			var sound = new Audio('nya.mp3');
			sound.play();
		} else if (document.getElementById('selectsound').value == "val2"){
			var sound = new Audio('dasha.mp3');
			sound.play();
		} else if (document.getElementById('selectsound').value == "val3"){
			var sound = new Audio('WOO.mp3');
			sound.play();
		}
        Image_Id.src = "2.png"; // change to 2nd
		const clicks = document.querySelector('.clicks'); // looking for class clicks
		clicks.id = document.querySelector('clicks'); // gets an id
		score += 1; // adds 1 point
		clicks.innerHTML = score; // changing it in <a>
        }
        else{
        Image_Id.src = "1.png"; // returt 1st pic
		}
    }
	function changeSound() {
		if(document.getElementById('selectsound').value == "val1") {
			var sound = new Audio('nya.mp3');
			sound.play();
		} else if (document.getElementById('selectsound').value == "val2"){
			var sound = new Audio('dasha.mp3');
			sound.play();
		} else if (document.getElementById('selectsound').value == "val3"){
			var sound = new Audio('WOO.mp3');
			sound.play();
		} 
	}