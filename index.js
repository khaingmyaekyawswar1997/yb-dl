const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { URLSearchParams } = require('url');
const fetch = require('isomorphic-fetch');
const clientId = '9d193e7f-c277-4dae-b86d-93ad5b3c84c1';
const clientSecret = '0zAiXX06xscCLJ_P-.AZIUI-9V0-dCQ6q_';
const refreshToken = '0.ASoAdlosxidU-EqhFRfgqenT-X8-GZ13wq5NuG2TrVs8hMEqAK0.AgABAAAAAAD--DLA3VO7QrddgJg7WevrAgDs_wQA9P-_jpUIz99pzT6i47jyErxoTt2ogGBs7SqAJW38BL4wOZ10S1aJMiybddzFIkJPm209YmSD_mxdLGBLB33GTiCX3ibpefMSqoM5fOIiyusCkZlokYNCAt5Wm_gFyVZIrG4v9KDfcOrLTqf_OmdFtAtG4QwGrVCQCqmR-PTLAKQjlOibyNYDalE9ZPlXdVHfe6Z2EoFkozdT71QsGj-E1Isuq_5SX5F0DI0mwojk4OFuaEX-bBu1LCazyr0mLIvwYpO3kUF9tCo36sHlSbhFkbaSWUVAbVzCd43fE6JHU50Xf7dU1lXcU_dvev1-BdHsWXb--_Q1D_1VfA5vuiCHhT5xGNCCNf7HskUECwUN6GC-py5CW4t-g-fo-DggJ-MKSYuGziBFl10NFYTcrDd8gK3QltaFXD-Ogj01i0H1UCWmnsHuI8Msf9-FZtO43E6iHhjeWG6GOGx6LyI5AU1U-njfmHd1Dnw9LRW7WQH6Yf5wteOHY1oF__1lz6uZALGfhMA65G6zXZAfS5IGFDmm_yCBlKFBrPPHSVlpautPjkEmYwUngvKXaE6sWHI22Td6XcjK5dI0D_z1fMxLoYtJqVebbFi9WUDL4fjwfgR-EM0wXYqrX6sOilUK22vBTkl7sSaMcJPmPaGMdrz1lVsuLmuy2981lO6XauvMQ1H5VTxO_ea3_0PAzKyKbGPjQmfCKhtqCE1_iCmY9ob7D6DacNEiwCWwgxjHlPkrIu4MjD8E09NGQe4dB3hbMSKZ8IFuiCk9mqa4reoBXitmhYv6TsCYoBeTDBpScUQiMYsW0wEBdCsGEnBlqP-ejks1cGCt25tkihGEYk1xDprtbLkidbKhpqgkd_u4azgphLajPMzoVp1BTnhiIRfgY_FoHzXwgHvx85oWYLnRIrieXzdBOkH3RMer_FJGITSiPJVnxktNj9LbcGtWA7PYLg';
const tenantId = 'c62c5a76-5427-4af8-a115-17e0a9e9d3f9';
const yd = require('youtube-dl-exec');
const mime= require('mime');
const Downloader = require('nodejs-file-downloader');

const params = new URLSearchParams();
params.append('client_id', clientId);
params.append('client_secret', clientSecret);
params.append('grant_type', 'refresh_token');
params.append('scope', 'files.readwrite.all')
params.append('refresh_token', refreshToken);


const init = async () => {
    console.log('Started...');

    console.log('Getting access token');
    let config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }
    let response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, params, config);
    let access_token = response.data.access_token;


    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    //console.log(access_token);


    console.log('Getting file list');

    try {
        
        let fileResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/root/children`, {}, {})
        let root = fileResponse.data.value;
        console.log('--------')
        root.map(item => {
            console.log(`${item.id} -> ${item.name}`)
        })
        console.log('--------')
        let youtubeArr = root.filter(item => item.name == 'Youtube');
        //console.log(youtubeArr)
        if (youtubeArr.length == 1) {
            let youtube = youtubeArr[0];
            console.log('Found youtube folder.');
            let youtubeFiles = await getFolderItem(youtube.id);

            youtubeFiles.map(async item => {
                console.log(item.id);
                let data = await downloadAndReadData(item);
                console.log(`Data -> ${data}`);
                //await downloadYoutubeVideo(data);
                let matchFile = searchFile(data);
                if(matchFile){
                    uploadFile(matchFile);
                }else{
                    console.error('Error file not found.');
                }
            })
        }
        console.log('---------------')
        let downloadCheck= root.filter(item => item.name == 'Download');
        if(downloadCheck.length ==1 ){
            let folder = downloadCheck[0];
            console.log('Found download folder.');
            let downloadFiles = await getFolderItem(folder.id);
            downloadFiles.map(async item=>{
                console.log(item.id);
                let data = await downloadAndReadData(item);
                console.log(`Data -> ${data}`);
                let fileName = await downloadURL(data);
                let matchFile = searchFile(fileName);
                if(matchFile){
                    uploadFile(matchFile);
                }else{
                    console.error('Error file not found.');
                }
            })
        }

    } catch (error) {
        console.log(error);
    }

}


const getFolderItem = async id => {
    console.log(`Getting items of a folder ${id}`)
    let fileResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${id}/children`, {}, {})
    let files = fileResponse.data.value;
    return files;
}

const downloadAndReadData = async file => {
    let fileResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`, {}, {})
    //console.log(typeof(fileResponse.data))
    //fs.writeFileSync(`dowmload${file.name}`,fileResponse.data)
    return fileResponse.data;
}

const downloadYoutubeVideo = async id => {

    await yd(`https://youtube.com/watch?v=${id}`, {
        format: 'bestaudio+bestvideo',
        output: `${id}UUUU%(name).%(ext)s`
    });
}

const uploadFile = async fileName => {
    console.log(`Uploading file -> ${fileName}`)
    try {
        let uploadResponse = await axios.post(`https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/createUploadSession`, {
            data: {
                "item": {
                    "@odata.type": "microsoft.graph.driveItemUploadableProperties",
                    "@microsoft.graph.conflictBehavior": "fail",
                    "name": fileName
                }
            }
        }, { headers: { 'Content-Type': 'application/json' } })
        let uploadSession = uploadResponse.data
        //console.log(uploadSession);

        let uploadSessionURL = uploadSession.uploadUrl
        let file = fs.readFileSync(fileName);


        let config = {
            headers: {
                'Content-Type': mime.getType(fileName),
                'Content-Length': file.byteLength,
                'Content-Range': `bytes 0-${file.byteLength - 1}/${file.byteLength}`
            },
            maxBodyLength:file.byteLength+1
        }
        console.log(config.headers);
        let actualUploadResponse = await axios.put(uploadSessionURL, file, config)
        console.log(`Created -> ${actualUploadResponse.data.name}`);
        console.log('Upload finished.')

        console.log(`File deleted.`)
        fs.unlinkSync(fileName);
    } catch (error) {
        console.log(error)
    }
}

const downloadURL = async url => {
    console.log(`Download started for ${url}`)
    let fileName = '';
    //implement general file download
    const downloader = new Downloader({
        url: url,    
        directory: "./",
        onBeforeSave:(deducedName)=>{
            console.log(`The file name is: ${deducedName}`)
            fileName = deducedName;
          }              
      })

      try {
        await downloader.download();//Downloader.download() returns a promise.
  
        console.log('Download done..');
        return fileName;
      } catch (error) {
        console.log('Download failed.',error)
        return null;
      }
}

const searchFile = id =>{

    let reg = new RegExp(`${id}UUUU\.*`,'g')
    let matchFile = null;
    console.log('Searching downloaded file.')
    fs.readdirSync('./').every(file=>{
        if(file.match(reg)){
            matchFile = file;
            return false;
        }
        return true;
    })
    console.log(`File match -> ${matchFile}`);
    return matchFile;
}

init();
