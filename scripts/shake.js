var footer = document.getElementById("footer");

// Add event listener for hover
footer.addEventListener("mouseover", function() {
  // Add the "shake" class to the footer
  footer.classList.add("shake");
});

// Remove the "shake" class when the mouse leaves the footer
footer.addEventListener("mouseout", function() {
  // Remove the "shake" class from the footer
  footer.classList.remove("shake");
});