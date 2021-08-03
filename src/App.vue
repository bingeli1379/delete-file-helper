<template>
  <div id="app">
    <b-overlay :show="isLoading" spinner-variant="primary" bg-color="rgba(255, 255, 255, 0.5)" opacity="1">
      <b-container class="py-4">
        <b-input-group class="mb-4">
          <b-form-input v-model="folderPath" disabled></b-form-input>
          <b-input-group-append>
            <b-button variant="primary" @click="getFolderPath">
              選擇資料夾路徑
            </b-button>
          </b-input-group-append>
        </b-input-group>

        <div class="d-flex justify-content-between border border-bottom-0 p-2">
          <h5 class="text-success font-weight-bold mb-0">保留資料清單</h5>
          <b-link @click="clickFile">選擇檔案</b-link>
          <input ref="file" type="file" class="d-none" accept=".csv" @change="getKeepFileList">
        </div>
        <b-table outlined small sticky-header :items="filterKeepFileList" :fields="fields" class="mb-4"></b-table>

        <div class="d-flex justify-content-between border border-bottom-0 p-2">
          <h5 class="text-danger font-weight-bold mb-0">刪除資料清單</h5>
          <b-link @click="downloadWantDeleteFileList">下載檔案</b-link>
          <input ref="file" type="file" class="d-none" accept=".csv" @change="getKeepFileList">
        </div>
        <b-table outlined small sticky-header :items="filterWantDeleteFileList" :fields="fields" class="mb-4"></b-table>

        <div class="d-flex justify-content-between border border-bottom-0 p-2">
          <h5 class="text-warning font-weight-bold mb-0">預計保留但沒有檔案</h5>
          <b-link @click="downloadNotFoundList">下載檔案</b-link>
          <input ref="file" type="file" class="d-none" accept=".csv" @change="getKeepFileList">
        </div>
        <b-table outlined small sticky-header :items="notFoundList" :fields="fields"></b-table>

        <b-button block variant="danger" @click="deleteFile">
          刪除檔案
        </b-button>
      </b-container>
    </b-overlay>
  </div>
</template>

<script>
export default {
  name: 'App',
  data () {
    return {
      isLoading: false,
      folderPath: '',
      keepFileList: [],
      filePaths: [],
      fields: [
        {
          key: 'name',
          label: '檔案名稱'
        }
      ]
    }
  },
  computed: {
    filterKeepFileList () {
      if (this.keepFileList.length === 0) {
        return [{ name: '沒有任何檔案' }]
      } else {
        return this.keepFileList.map(item => ({ name: item }))
      }
    },
    filterWantDeleteFileList () {
      if (this.filePaths.length === 0) {
        return [{ name: '沒有任何檔案' }]
      } else {
        return this.filePaths.filter(path => {
          const lastBackslashIndex = path.lastIndexOf('\\') + 1
          const pathLength = path.length
          const fileName = path.slice(lastBackslashIndex, pathLength)
          return !this.keepFileList.some(keepFileName => fileName.indexOf(keepFileName) !== -1)
        }).map(item => ({ name: item }))
      }
    },
    notFoundList () {
      if (this.keepFileList.length === 0 || this.filePaths.length === 0) {
        return [{ name: '沒有任何檔案' }]
      } else {
        return this.keepFileList.filter(item => {
          return this.filePaths.every(path => path.indexOf(item) === -1)
        }).map(item => ({ name: item }))
      }
    }
  },
  methods: {
    async getFolderPath () {
      try {
        const options = { properties: ['openFile', 'openDirectory'] }
        const pathData = await window.dialog.showOpenDialog(options)
        this.folderPath = pathData?.filePaths[0]
        this.isLoading = true
        const filePaths = await window.ipcRenderer.invoke('getFilePaths', this.folderPath)
        this.filePaths = filePaths
        this.isLoading = false
      } catch (error) {
        this.isLoading = false
        this.folderPath = ''
        this.filePaths = []
        this.$bvModal.msgBoxOk('資料夾路徑讀取錯誤', { title: '錯誤' })
      }
    },
    getKeepFileList (e) {
      if (e.target.files.length === 0) return
      try {
        this.isLoading = true
        const file = e.target.files[0]
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = e => {
          this.keepFileList = this.csvToArray(e.target.result)
          this.isLoading = false
        }
      } catch (error) {
        this.isLoading = false
        this.keepFileList = []
        this.$bvModal.msgBoxOk('檔案讀取錯誤', { title: '錯誤' })
      }
    },
    csvToArray (data) {
      if (data.indexOf(',') === -1) {
        return data.replace(/\r\n/g, ',').split(',').filter(item => item).map(item => item?.trim())
      } else {
        return data.replace(/\r\n/g, '').split(',').filter(item => item).map(item => item?.trim())
      }
    },
    clickFile () {
      this.$refs.file.click()
    },
    downloadWantDeleteFileList () {
      if (this.filePaths.length === 0) {
        return this.$bvModal.msgBoxOk('請先選擇資料夾路徑', { title: '錯誤' })
      }
      const dataList = this.filterWantDeleteFileList.map(item => item.name).join(',\n')
      const blob = new Blob([dataList], { type: 'text/csv' })
      const downloadLink = document.createElement('a')
      downloadLink.href = window.URL.createObjectURL(blob)
      downloadLink.download = 'deleteList.csv'
      downloadLink.click()
    },
    downloadNotFoundList () {
      if (this.keepFileList.length === 0 || this.filePaths.length === 0) {
        return this.$bvModal.msgBoxOk('請先選擇資料夾路徑與保留資料清單', { title: '錯誤' })
      }
      const dataList = this.notFoundList.map(item => item.name).join(',\n')
      const blob = new Blob([dataList], { type: 'text/csv' })
      const downloadLink = document.createElement('a')
      downloadLink.href = window.URL.createObjectURL(blob)
      downloadLink.download = 'notFoundList.csv'
      downloadLink.click()
    },
    deleteFile () {
      this.$bvModal.msgBoxConfirm('確定要刪除檔案嗎？', { title: '刪除檔案' }).then(async result => {
        if (!result) return
        try {
          this.isLoading = true
          const filePathList = this.filePaths.length === 0 ? [] : this.filterWantDeleteFileList.map(item => item.name)
          await window.ipcRenderer.invoke('deleteFile', this.folderPath, filePathList)
          this.folderPath = ''
          this.keepFileList = []
          this.filePaths = []
          this.$bvModal.msgBoxOk('刪除成功', { title: '成功' })
          this.isLoading = false
        } catch (error) {
          this.isLoading = false
          this.$bvModal.msgBoxOk('刪除錯誤', { title: '錯誤' })
        }
      })
    }
  }
}
</script>
