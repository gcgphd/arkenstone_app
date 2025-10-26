import React, { useState } from "react";
import { Grid, Card } from "antd";
import { PlusOutlined } from '@ant-design/icons';
import { Image, Upload, message, Button } from 'antd';
import type { GetProp, UploadFile, UploadProps } from 'antd';

const { useBreakpoint } = Grid;

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];



const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

interface GenerateCardProps {
  isMobile?: boolean;
  fileList: UploadFile[];                       // ✅ controlled
  onFileListChange: (list: UploadFile[]) => void; // ✅ bubble changes up
}

const GenerateCard: React.FC<GenerateCardProps> = ({
  isMobile: forcedMobile,
  fileList,
  onFileListChange,
}) => {
  const screens = useBreakpoint();
  const isMobile = forcedMobile ?? !screens.sm;

  // ✅ Responsive width logic (no 100vw)
  const CARD_H = 120;          // avoid tall overflow on phones
  const CARD_PAD = isMobile ? 0 : 0;

  const ERROR_FALLBACK = "/assets/upload_error.png";

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  //const [fileList, setFileList] = useState<UploadFile[]>([]);

  // ✅ Use the instance API and render its context holder
  const [messageApi, messageContextHolder] = message.useMessage();


  const parseResp = (resp: any) => {
    // resp might be string or object depending on transport
    try {
      return typeof resp === "string" ? JSON.parse(resp) : resp;
    } catch {
      return undefined;
    }
  };

  const handlePreview = async (file: UploadFile) => {

    if (file.status === "error") {
      // error: show error thumbnail (or fallback)
      const src = file.thumbUrl || ERROR_FALLBACK;
      setPreviewImage(src);
      setPreviewOpen(false);
      return;
    }

    // success/uploading: prefer server URL, else base64, else thumbUrl
    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
    const src = file.url || (file.preview as string) || file.thumbUrl || "";
    if (src) {
      setPreviewImage(src);
      setPreviewOpen(true);
    }
  };

  const handleChange: UploadProps["onChange"] = ({ file, fileList: newList }) => {

    // Success path: normalize server URL to both url/thumbUrl if provided
    if (file.status === "done") {
      const resp = parseResp(file.response);
      if (resp?.url) {
        const absolute = resp.url.startsWith("http") ? resp.url : `http://localhost:8080${resp.url}`;
        newList = newList.map((f) =>
          f.uid === file.uid ? { ...f, url: absolute, thumbUrl: absolute } : f
        );
      }
      onFileListChange(newList);
      return;
    }

    if (file.status === "error") {
      const resp = parseResp(file.response);
      const messageText = "Upload failed — please try again."; //resp?.message || 
      const customThumb = resp?.errorThumbUrl || ERROR_FALLBACK;

      // Show toast via the instance
      messageApi.error(messageText);

      const updated: UploadFile<any>[] = newList.map((f): UploadFile<any> =>
        f.uid === file.uid
          ? {
            ...f,
            status: "error",
            url: undefined,
            thumbUrl: customThumb,
            percent: undefined,
            response: "Upload failed - please try again"
          }
          : f
      );

      onFileListChange(updated);             // ✅ still UploadFile[]
      return;
    }

    // Other statuses (uploading, removed, etc.)
    onFileListChange(newList);
  };


  const uploadButton = (
    <Button
      type="primary"         // 👈 uses theme's colorPrimary
      icon={<PlusOutlined />}
      block
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "var(--ant-color-primary)",
      }}
    >
      Upload
    </Button>
  );

  return (
    <Card
      //hoverable
      style={{
        width: "100%",
        //maxWidth: 420,
        //minWidth: 0,                  
        height: CARD_H,
        minHeight: 0,
        flex: isMobile ? "0 1 auto" : "0 0 120px",
        display: "flex",
        //flexDirection: "column",
        padding: CARD_PAD,
      }}
      styles={{
        body: {
          flex: 1,
          display: "flex",
          overflow: "auto", // scroll if needed on phones
          padding: 10,
          minHeight: 0,

        },
      }}
    >
      <Upload
        action="http://localhost:8080/upload_image_to_dir"
        listType="picture-card"
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        multiple
        style={{
          height: '100%'
        }}
      >
        {messageContextHolder}

        {fileList.length >= 8 ? null : uploadButton}
      </Upload>
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
        />
      )}
    </Card>
  );
};

export default GenerateCard;

