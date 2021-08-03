const fs = require('fs')
const { ipcMain } = require('electron')

// function getChildPath (path) {
//   let files = []
//   if (fs.existsSync(path)) {
//     files = fs.readdirSync(path)
//     files.forEach((file, index) => {
//       const curPath = path + '/' + file
//       if (fs.statSync(curPath).isDirectory()) {
//         delDir(curPath) // 遞迴刪除資料夾
//       } else {
//         fs.unlinkSync(curPath) // 刪除檔案
//       }
//     })
//     fs.rmdirSync(path)
//   }
// }

function getFilePath (path) {
  let filePaths = []
  const fileList = fs.readdirSync(path)
  fileList.forEach(fileName => {
    const currentFilePath = `${path}\\${fileName}`
    if (fs.statSync(currentFilePath).isDirectory()) {
      const data = getFilePath(currentFilePath)
      filePaths = filePaths.concat(data)
    } else {
      filePaths.push(currentFilePath)
    }
  })
  return filePaths
}

ipcMain.handle('getFilePaths', (e, folderPath) => {
  return getFilePath(folderPath)
})

function deleteEmptyDir (path) {
  const fileList = fs.readdirSync(path)
  fileList.forEach(fileName => {
    const currentFilePath = `${path}\\${fileName}`
    if (fs.statSync(currentFilePath).isDirectory()) {
      if (fs.readdirSync(currentFilePath).length !== 0) {
        deleteEmptyDir(currentFilePath)
      }
      if (fs.readdirSync(currentFilePath).length === 0) {
        fs.rmdirSync(currentFilePath)
      }
    }
  })
}

ipcMain.handle('deleteFile', (e, folderPath, filePathList) => {
  filePathList.forEach(path => {
    fs.unlinkSync(path)
  })
  deleteEmptyDir(folderPath)
})
