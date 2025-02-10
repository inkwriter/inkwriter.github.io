document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Script is running"); // For debugging
    
    const placeholder = document.querySelector('.placeholder');
    placeholder.style.backgroundImage = "url('../img_folder/vdayMe.jpg')";

    const yesButton = document.getElementById('yesButton');
    const noButton = document.getElementById('noButton');
    let noClickCount = 0;

    console.log("Yes Button:", yesButton);
    console.log("No Button:", noButton);

    yesButton.addEventListener('click', function() {
        placeholder.style.backgroundImage = "url('../img_folder/vdayyes.gif')";
        noButton.style.display = 'none';
        yesButton.style.width = '100px'; // Base size when yes is clicked
    });

    noButton.addEventListener('click', function() {
        noClickCount++;
        const noGifs = [
            "../img_folder/vdayno1.jpg",
            "../img_folder/vdayno2.jpg",
            "../img_folder/vdayno.gif",
        ];

        if (noClickCount <= 3) {
            // Change the image in sequence
            placeholder.style.backgroundImage = `url('${noGifs[noClickCount - 1]}')`;
            
            // Loop to adjust button sizes
            for (let i = 1; i <= noClickCount; i++) {
                // Decrease 'No' button size by 10px each iteration
                noButton.style.width = (parseInt(noButton.style.width) || 50) - 10 + 'px';
                // Increase 'Yes' button size by 10px times the click count
                yesButton.style.width = (parseInt(yesButton.style.width) || 50) + 10 * noClickCount + 'px';
                
                console.log("No Button Width:", noButton.style.width);
                console.log("Yes Button Width:", yesButton.style.width);
            }

            if (noClickCount === 3) {
                // After the third click, hide the no button after a delay
                setTimeout(() => {
                    noButton.style.display = 'none';
                }, 500); // Give a moment for the last animation
            }
        }
    });
});