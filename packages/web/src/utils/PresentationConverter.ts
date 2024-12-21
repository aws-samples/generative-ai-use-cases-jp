import pptxgen from 'pptxgenjs';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ImageData {
  src: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface SlideContent {
  type: 'title' | 'content';
  title?: string;
  content?: string[];
  table?: TableData;
  image?: ImageData;
}

const DEFAULT_IMAGE_SIZE = { width: 4, height: 3 };

export class PresentationConverter {
  private pres: pptxgen;

  constructor() {
    this.pres = new pptxgen();
  }

  /**
   * タイトルスライドの作成
   */
  private createTitleSlide(content: SlideContent) {
    const slide = this.pres.addSlide();

    if (content.title) {
      slide.addText(content.title, {
        x: 1,
        y: 2,
        w: '80%',
        h: 1,
        fontSize: 44,
        color: '363636',
        align: 'center',
        bold: true,
      });
    }

    if (content.content && content.content.length > 0) {
      slide.addText(content.content[0], {
        x: 1,
        y: 3.2,
        w: '80%',
        h: 0.5,
        fontSize: 24,
        color: '666666',
        align: 'center',
      });
    }
  }

  /**
   * スライドにテーブルを追加
   */
  private addTableToSlide(
    slide: pptxgen.Slide,
    tableData: TableData,
    yPosition: number
  ) {
    const tableRows = [
      tableData.headers.map((header) => ({
        text: header,
        options: { bold: true, fill: { color: 'F5F5F5' } },
      })),
      ...tableData.rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: {},
        }))
      ),
    ];

    slide.addTable(tableRows, {
      x: 0.7,
      y: yPosition,
      w: '85%',
      border: { type: 'solid', color: 'CCCCCC', pt: 1 },
      color: '363636',
      fontSize: 16,
    });
  }

  /**
   * スライドに画像を追加
   */
  private async addImageToSlide(
    slide: pptxgen.Slide,
    imageData: ImageData,
    yPosition: number
  ) {
    try {
      const response = await fetch(imageData.src);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          slide.addImage({
            data: base64,
            x: imageData.x ?? 0.7,
            y: imageData.y ?? yPosition,
            w: imageData.width ?? DEFAULT_IMAGE_SIZE.width,
            h: imageData.height ?? DEFAULT_IMAGE_SIZE.height,
          });
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }

  /**
   * コンテンツスライドの作成
   */
  private async createContentSlide(content: SlideContent) {
    const slide = this.pres.addSlide();
    let currentY = 1.5;

    if (content.title) {
      slide.addText(content.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 0.8,
        fontSize: 32,
        color: '363636',
        bold: true,
      });
    }

    if (content.content) {
      for (const [index, point] of content.content.entries()) {
        const isCode = point.startsWith('[Code]');
        if (isCode) {
          // コードブロックの特別な処理
          const code = point.replace('[Code]', '').trim();
          slide.addText(code, {
            x: 0.7,
            y: currentY + index * 0.7,
            w: '85%',
            h: '45%',
            fontSize: 16,
            color: '363636',
            fontFace: 'Courier New',
            fill: { color: 'F5F5F5' },
            line: { color: 'CCCCCC', width: 1 },
          });
        } else {
          // 通常のテキスト
          slide.addText(point, {
            x: 0.7,
            y: currentY + index * 0.7,
            w: '85%',
            h: 0.5,
            fontSize: 24,
            color: '363636',
            bullet: true,
          });
        }
      }
      currentY += content.content.length * 0.7;
    }

    // テーブルの処理
    if (content.table) {
      this.addTableToSlide(slide, content.table, currentY);
    }

    // 画像の処理
    if (content.image) {
      await this.addImageToSlide(slide, content.image, currentY);
    }
  }

  /**
   * RevealのDOMからPPTXへの変換
   */
  public async convertFromRevealDOM(container: HTMLElement): Promise<void> {
    const slides: SlideContent[] = [];
    const slideElements = container.querySelectorAll('.slides section');

    slideElements.forEach((slideElement) => {
      const content: SlideContent = { type: 'content' };
      const contentItems: string[] = [];

      // テキストコンテンツの収集
      slideElement
        .querySelectorAll('h1, h2, h3, li, p, pre code, table, img')
        .forEach((element) => {
          if (element.tagName === 'H1') {
            content.type = 'title';
            content.title = element.textContent || '';
          } else if (element.tagName === 'H2' || element.tagName === 'H3') {
            content.type = 'content';
            content.title = element.textContent || '';
          } else if (element.tagName === 'LI' || element.tagName === 'P') {
            contentItems.push(element.textContent || '');
          } else if (element.tagName === 'CODE') {
            contentItems.push(`[Code]${element.textContent || ''}`);
          } else if (element.tagName === 'TABLE') {
            const headers: string[] = [];
            const rows: string[][] = [];

            // ヘッダーの処理
            element.querySelectorAll('th').forEach((th) => {
              headers.push(th.textContent || '');
            });

            // 行の処理
            element.querySelectorAll('tr').forEach((tr) => {
              const cells: string[] = [];
              tr.querySelectorAll('td').forEach((td) => {
                cells.push(td.textContent || '');
              });
              if (cells.length > 0) {
                rows.push(cells);
              }
            });

            content.table = { headers, rows };
          } else if (element.tagName === 'IMG') {
            const imgElement = element as HTMLImageElement;
            content.image = {
              src: imgElement.src || '',
              width: imgElement.naturalWidth / 96, // ピクセルからインチに変換
              height: imgElement.naturalHeight / 96,
            };
          }
        });

      if (contentItems.length > 0) {
        content.content = contentItems;
      }

      slides.push(content);
    });

    this.pres.defineLayout({
      name: 'CUSTOM',
      width: 10,
      height: 5.625,
    });
    this.pres.layout = 'CUSTOM';

    for (const slide of slides) {
      if (slide.type === 'title') {
        this.createTitleSlide(slide);
      } else {
        await this.createContentSlide(slide);
      }
    }

    await this.pres.writeFile({ fileName: 'presentation.pptx' });
  }
}
