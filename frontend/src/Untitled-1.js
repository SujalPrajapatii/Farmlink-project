const express = require("express");
const fs = require("fs");

const app = express();

app.delete("/delete-file", (req, res) => {
    fs.unlink("uploads/image.jpg", (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to delete file" });
        }

        res.json({ message: "File deleted successfully" });
    });
});

app.listen(3000, () => console.log("Server running on port 3000"));