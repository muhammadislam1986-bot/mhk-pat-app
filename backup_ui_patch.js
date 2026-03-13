/* Backup message system */

function showBackupMessage(type, message){

    const box = document.createElement("div");
    box.className = "backup-notice-" + type;
    box.innerText = message;

    const container = document.querySelector("#backupSection");

    if(container){
        container.prepend(box);
        setTimeout(()=>{
            box.remove();
        },5000);
    }

}

/* call after export */
function backupExported(){

    showBackupMessage(
        "success",
        "Backup exported successfully. File saved to your Downloads folder."
    );

}

/* call after import */
function backupImported(){

    showBackupMessage(
        "info",
        "Backup imported successfully. App data restored."
    );

}