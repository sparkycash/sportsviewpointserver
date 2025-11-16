
import { postWithMedia } from "../publishers/Twitter/PostToTwitter.js";
import { ImageDownloader } from "../lib/ImageUtils/ImageDownloader.js";
import { FileDeleter } from "../lib/ImageUtils/FileDeleter.js";
import { toSafeFilename } from "../lib/globalfunctions.js";

export async function TwitterAction(title,text,imageUrl) {

  

    // console.log(`
    //     TITLE:

    //     ${title}

    //     TEXT:

    //     ${text}

    //     IMAGE URL :

    //     ${imageUrl}

    //     =============================== completed
    //     `)



    if (!text){
        return
    }

    let image_name = toSafeFilename(title)

    if (!image_name){
        console.log("Invalid Image Name")
        return
    }

    console.log("ImageName: "+ image_name);



    let image_path = await ImageDownloader(imageUrl,image_name)
    console.log(image_path)
      const result = await postWithMedia(text, image_path);



     await FileDeleter(image_path)



}