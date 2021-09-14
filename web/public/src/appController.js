export default class AppController {
  constructor({ viewManager, connectionManager, dragAndDropManager }) {
    this.connectionManager = connectionManager;
    this.viewManager = viewManager;
    this.dragAndDropManager = dragAndDropManager;

    this.uploadingFiles = new Map();
  }

  async initialize() {
    this.viewManager.configureFileBtnClick();
    this.viewManager.configureOnFileChange(this.onFileChange.bind(this));
    this.viewManager.configureModal();

    this.dragAndDropManager.initialize({
      onDropHandler: this.onFileChange.bind(this),
    });

    this.connectionManager.configureEvents({
      onProgress: this.onProgress.bind(this),
    });

    this.viewManager.updateStatus(0);

    await this.updateCurrentFiles();
  }

  async onProgress({ processedAlready, filename }) {
    const file = this.uploadingFiles.get(filename);

    const alreadyProcess = Math.ceil((processedAlready / file.size) * 100);

    this.updateProgress(file, alreadyProcess);

    if (alreadyProcess < 98) return;

    return this.updateCurrentFiles();
  }

  async updateProgress(file, percent) {
    const uploadsFiles = this.uploadingFiles;

    file.percent = percent;

    const total = [...uploadsFiles.values()]
      .map(({ percent }) => percent ?? 0)
      .reduce((total, current) => total + current, 0);

    this.viewManager.updateStatus(total);
  }

  async onFileChange(files) {
    this.uploadingFiles.clear();

    this.viewManager.openModal();
    this.viewManager.updateStatus(0);

    const requests = [];

    for (const file of files) {
      this.uploadingFiles.set(file.name, file);

      requests.push(this.connectionManager.uploadFile(file));
    }

    await Promise.all(requests);

    this.viewManager.updateStatus(100);

    setTimeout(() => this.viewManager.closeModal(), 1000);

    await this.updateCurrentFiles();
  }

  async updateCurrentFiles() {
    const files = await this.connectionManager.currentFiles();

    this.viewManager.updateCurrentFiles(files);
  }
}
